import { describe, it, expect } from "vitest";
import {
  BASE_CURRENCY,
  convertCostToUSD,
  requiredRateCurrencies,
  billingRate,
  seedRatesFromLegacy,
  quotationMargin,
  type CostRates,
} from "./currency";

describe("BASE_CURRENCY", () => {
  it("is USD", () => {
    expect(BASE_CURRENCY).toBe("USD");
  });
});

describe("convertCostToUSD", () => {
  it("passes USD costs through unchanged", () => {
    expect(convertCostToUSD(100, "USD", {})).toBe(100);
  });

  it("treats a missing costCurrency as USD", () => {
    expect(convertCostToUSD(100, undefined, {})).toBe(100);
  });

  it("treats an empty costCurrency as USD", () => {
    expect(convertCostToUSD(100, "", {})).toBe(100);
  });

  it("divides a DOP cost by its rate", () => {
    expect(convertCostToUSD(100, "DOP", { DOP: 60 })).toBeCloseTo(1.6666666666666667, 10);
  });

  it("divides a EUR cost by its rate (reported bug: EUR had no rate field before)", () => {
    expect(convertCostToUSD(200, "EUR", { EUR: 0.92 })).toBeCloseTo(217.391304347826, 6);
  });

  it("uses each currency's own rate when DOP and EUR are mixed in one rates map (reported bug)", () => {
    const rates: CostRates = { DOP: 60, EUR: 0.92 };
    expect(convertCostToUSD(100, "DOP", rates)).toBeCloseTo(1.6666666666666667, 10);
    expect(convertCostToUSD(200, "EUR", rates)).toBeCloseTo(217.391304347826, 6);
  });

  it("passes a cost through unconverted when there is no rate for its currency", () => {
    expect(convertCostToUSD(100, "GBP", { DOP: 60 })).toBe(100);
  });

  it("passes a cost through unconverted when the rate is 0", () => {
    expect(convertCostToUSD(100, "DOP", { DOP: 0 })).toBe(100);
  });

  it("passes a cost through unconverted when the rate is negative", () => {
    expect(convertCostToUSD(100, "DOP", { DOP: -60 })).toBe(100);
  });

  it("passes a cost through unconverted when the rate is NaN", () => {
    expect(convertCostToUSD(100, "DOP", { DOP: NaN })).toBe(100);
  });

  it("returns 0 for a zero amount", () => {
    expect(convertCostToUSD(0, "DOP", { DOP: 60 })).toBe(0);
  });

  it("returns 0 for a negative amount", () => {
    expect(convertCostToUSD(-50, "DOP", { DOP: 60 })).toBe(0);
  });
});

describe("requiredRateCurrencies", () => {
  it("returns EUR when billing in USD with EUR costs", () => {
    expect(requiredRateCurrencies("USD", ["EUR"])).toEqual(["EUR"]);
  });

  it("returns DOP and EUR (order-insensitive for the tail) when billing in USD with mixed costs", () => {
    const result = requiredRateCurrencies("USD", ["DOP", "EUR"]);
    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining(["DOP", "EUR"]));
  });

  it("puts the billing currency first when billing in DOP with EUR costs", () => {
    expect(requiredRateCurrencies("DOP", ["EUR"])).toEqual(["DOP", "EUR"]);
  });

  it("returns an empty list when billing in USD with only USD costs", () => {
    expect(requiredRateCurrencies("USD", ["USD"])).toEqual([]);
  });

  it("collapses duplicates", () => {
    expect(requiredRateCurrencies("USD", ["EUR", "EUR", "DOP", "DOP"])).toEqual(["EUR", "DOP"]);
  });

  it("does not duplicate the billing currency when it also appears in cost currencies", () => {
    expect(requiredRateCurrencies("DOP", ["DOP", "EUR"])).toEqual(["DOP", "EUR"]);
  });
});

describe("billingRate", () => {
  it("is 1 for USD billing", () => {
    expect(billingRate("USD", { DOP: 60 })).toBe(1);
  });

  it("returns the matching rate for non-USD billing", () => {
    expect(billingRate("DOP", { DOP: 60 })).toBe(60);
  });

  it("falls back to 1 when the rate is missing", () => {
    expect(billingRate("DOP", {})).toBe(1);
  });
});

describe("seedRatesFromLegacy", () => {
  it("keeps a non-empty rates map unchanged", () => {
    const rates: CostRates = { DOP: 58.5, EUR: 0.9 };
    expect(seedRatesFromLegacy("USD", 60, rates)).toBe(rates);
  });

  it("seeds DOP from a legacy rate on a USD-billed quotation", () => {
    expect(seedRatesFromLegacy("USD", 60, {})).toEqual({ DOP: 60 });
  });

  it("seeds the billing currency from a legacy rate on a non-USD-billed quotation", () => {
    expect(seedRatesFromLegacy("DOP", 58.5, {})).toEqual({ DOP: 58.5 });
  });

  it("returns an empty map when the legacy rate is 1 (no real conversion)", () => {
    expect(seedRatesFromLegacy("USD", 1, {})).toEqual({});
  });

  it("returns an empty map when the legacy rate is undefined", () => {
    expect(seedRatesFromLegacy("USD", undefined, {})).toEqual({});
  });

  it("returns an empty map when rates is undefined and there is no usable legacy rate", () => {
    expect(seedRatesFromLegacy("USD", undefined, undefined)).toEqual({});
  });

  it("returns an empty map when rates is null and there is no usable legacy rate", () => {
    expect(seedRatesFromLegacy("USD", undefined, null)).toEqual({});
  });
});

/**
 * Regression tests reproducing the two user-reported screenshots end-to-end through the
 * dialog's price formula: price = (costUSD + unitDist) / (1 - margin/100), rounded the same
 * way the dialog does (Math.round(x * 100) / 100 per unit price and per line total).
 */
describe("regression: screenshot scenarios (quotation billed in USD, ITBIS 18%)", () => {
  const round2 = (x: number) => Math.round(x * 100) / 100;

  it("screenshot 1 — two EUR items, rate {EUR: 0.92} — EUR cost is no longer silently treated as 1:1 USD", () => {
    const rates: CostRates = { EUR: 0.92 };

    const item1CostUSD = convertCostToUSD(200, "EUR", rates);
    const item1UnitPrice = round2(item1CostUSD / (1 - 0.3));
    const item1Total = round2(1 * item1UnitPrice);

    const item2CostUSD = convertCostToUSD(100, "EUR", rates);
    const item2UnitPrice = round2(item2CostUSD / (1 - 0.3));
    const item2Total = round2(12 * item2UnitPrice);

    expect(item1UnitPrice).toBeCloseTo(310.56, 2);
    expect(item2UnitPrice).toBeCloseTo(155.28, 2);

    const subtotal = round2(item1Total + item2Total);
    expect(subtotal).toBeCloseTo(2173.92, 2);

    const itbis = round2(Math.round(subtotal * 18) / 100);
    const total = round2(subtotal + itbis);
    expect(total).toBeCloseTo(2565.23, 2);
  });

  it("screenshot 2 — one EUR item + one DOP item, rates {DOP: 60, EUR: 0.92} — DOP keeps working, EUR gets fixed", () => {
    const rates: CostRates = { DOP: 60, EUR: 0.92 };

    const item1CostUSD = convertCostToUSD(200, "EUR", rates);
    const item1UnitPrice = round2(item1CostUSD / (1 - 0.3));
    const item1Total = round2(1 * item1UnitPrice);

    const item2CostUSD = convertCostToUSD(100, "DOP", rates);
    const item2UnitPrice = round2(item2CostUSD / (1 - 0.3));
    const item2Total = round2(12 * item2UnitPrice);

    // DOP item was already correct before this fix — must remain unchanged.
    expect(item2UnitPrice).toBeCloseTo(2.38, 2);
    // EUR item was wrong before this fix (1 EUR treated as 1 USD) — now fixed.
    expect(item1UnitPrice).toBeCloseTo(310.56, 2);

    const subtotal = round2(item1Total + item2Total);
    const itbis = round2(Math.round(subtotal * 18) / 100);
    const total = round2(subtotal + itbis);
    expect(total).toBeCloseTo(400.16, 2);
  });
});

describe("quotationMargin", () => {
  // Reported from production: a quote priced at a 30% margin displayed 40.68%.
  // Subtotal 1705.34 + 18% ITBIS 306.96 = total 2012.30, against a cost of 1193.71.
  // Measuring against the total gave 2012.30 - 1193.71 = 818.59 -> 40.68%.
  it("measures margin against the pre-tax subtotal, not the ITBIS-inclusive total", () => {
    const { marginUSD, marginPercent } = quotationMargin(1705.34, 1193.71);
    expect(marginUSD).toBe(511.63);
    expect(marginPercent).toBe(30);
  });

  it("does not reproduce the ITBIS-inflated figures for that quote", () => {
    const { marginUSD, marginPercent } = quotationMargin(1705.34, 1193.71);
    expect(marginUSD).not.toBe(818.59);
    expect(marginPercent).not.toBe(40.68);
  });

  it("is unaffected by the ITBIS rate, since the tax never enters the base", () => {
    const noTax = quotationMargin(1000, 700);
    expect(noTax.marginPercent).toBe(30);
    expect(noTax.marginUSD).toBe(300);
  });

  it("returns a zero-cost quote as a 100% margin", () => {
    expect(quotationMargin(500, 0)).toEqual({ marginUSD: 500, marginPercent: 100 });
  });

  it("reports a negative margin when cost exceeds price", () => {
    const { marginUSD, marginPercent } = quotationMargin(800, 1000);
    expect(marginUSD).toBe(-200);
    expect(marginPercent).toBe(-25);
  });

  it("yields 0% instead of dividing by zero on an empty quote", () => {
    expect(quotationMargin(0, 0)).toEqual({ marginUSD: 0, marginPercent: 0 });
    expect(quotationMargin(0, 150)).toEqual({ marginUSD: -150, marginPercent: 0 });
  });

  it("rounds both results to two decimals", () => {
    const { marginUSD, marginPercent } = quotationMargin(3, 1);
    expect(marginUSD).toBe(2);
    expect(marginPercent).toBe(66.67);
  });
});
