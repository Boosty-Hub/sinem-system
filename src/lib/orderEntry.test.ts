import { describe, it, expect } from "vitest";
import { isWonStatus, isDeadStatus, orderEntryContribution } from "./orderEntry";

/** Minimal shape of what the Order Entry rules read off a prospect. */
const deal = (status: string, priceUSD: number, weighted: number) => ({ status, priceUSD, weighted });

describe("isWonStatus", () => {
  it("counts ganado, facturada and the legacy cerrados as booked", () => {
    expect(isWonStatus("ganado")).toBe(true);
    expect(isWonStatus("facturada")).toBe(true);
    expect(isWonStatus("cerrados")).toBe(true);
  });

  it("does not count open pipeline or dead deals as booked", () => {
    for (const s of ["prospecto", "propuesta", "seguimiento", "standby", "negociacion", "calificado", "perdido", "cancelado"]) {
      expect(isWonStatus(s)).toBe(false);
    }
  });
});

describe("isDeadStatus", () => {
  it("counts perdido and cancelado as dead", () => {
    expect(isDeadStatus("perdido")).toBe(true);
    expect(isDeadStatus("cancelado")).toBe(true);
  });

  it("does not treat facturada as dead — an invoiced order is booked, not lost", () => {
    expect(isDeadStatus("facturada")).toBe(false);
  });

  it("does not treat open pipeline as dead", () => {
    for (const s of ["prospecto", "propuesta", "seguimiento", "standby", "ganado"]) {
      expect(isDeadStatus(s)).toBe(false);
    }
  });
});

describe("orderEntryContribution", () => {
  it("counts open pipeline at its weighted value", () => {
    expect(orderEntryContribution(deal("seguimiento", 100_000, 35_000))).toBe(35_000);
  });

  it("counts booked business at full price, never discounted by probability", () => {
    // Defensive: production keeps go/get at 100 for booked deals, so weighted === price.
    // If someone edits those percentages, the booked amount must not shrink with them.
    expect(orderEntryContribution(deal("ganado", 250_000, 120_000))).toBe(250_000);
    expect(orderEntryContribution(deal("facturada", 587_555.55, 0))).toBe(587_555.55);
  });
});

/**
 * Regression: the Order Entry Forecast bar dropped every invoiced opportunity, so the
 * forecast came out lower than the Current bar that does count them. Figures below are the
 * production totals for Estimated OE 2026 at the time of the fix.
 */
describe("regression: Order Entry forecast must include invoiced opportunities", () => {
  const oe2026 = [
    deal("facturada", 587_555.55, 587_555.55),
    deal("ganado", 1_035_155.31, 1_035_155.31),
    deal("propuesta", 9_126_941.16, 38_871.4),
    deal("prospecto", 1_500_000, 20_000),
    deal("seguimiento", 36_430_329.34, 2_791_528.89),
    deal("standby", 26_720_758.98, 58_122.95),
    deal("perdido", 26_625_706.77, 0),
    deal("cancelado", 1_464_214.23, 0),
  ];

  const currentTotal = oe2026.filter((d) => isWonStatus(d.status)).reduce((s, d) => s + d.priceUSD, 0);
  const forecastTotal = oe2026.filter((d) => !isDeadStatus(d.status)).reduce((s, d) => s + orderEntryContribution(d), 0);

  it("adds the invoiced total back into the forecast", () => {
    expect(forecastTotal).toBeCloseTo(4_531_234.1, 2);
    // Before the fix the same data produced 3,943,678.55 — short by the invoiced 587,555.55.
    expect(forecastTotal - 3_943_678.55).toBeCloseTo(587_555.55, 2);
  });

  it("never reports a forecast below the already-booked current", () => {
    expect(currentTotal).toBeCloseTo(1_622_710.86, 2);
    expect(forecastTotal).toBeGreaterThan(currentTotal);
  });

  it("keeps lost and cancelled opportunities out of the forecast", () => {
    const withDead = oe2026.reduce((s, d) => s + orderEntryContribution(d), 0);
    expect(withDead).toBeCloseTo(forecastTotal, 2);
  });
});
