/**
 * Pure currency math for the quotations module. Extracted from QuotationDialog so it is
 * unit-testable in isolation, with no dependency on React or Supabase types.
 *
 * Manual exchange rates are keyed by currency code and expressed as "1 USD = value <key>",
 * e.g. { DOP: 60, EUR: 0.92 } means 1 USD = 60 DOP and 1 USD = 0.92 EUR. This replaces the
 * older single-rate model (one `exchange_rate` column) that could only express one non-USD
 * currency at a time and never covered EUR when billing in USD.
 */
export type CostRates = Record<string, number>;

export const BASE_CURRENCY = "USD";

/** Convert a cost amount expressed in `costCurrency` into USD using the per-currency rate map.
 *  - Falsy or non-positive amounts convert to 0.
 *  - A missing/empty cost currency is treated as USD.
 *  - USD costs pass through unchanged.
 *  - Costs in a currency with a usable rate (finite and > 0) are divided by that rate.
 *  - Costs in a currency with no usable rate pass through UNCONVERTED (best effort): a
 *    missing rate must never silently zero out a real cost. */
export const convertCostToUSD = (
  amount: number,
  costCurrency: string | undefined,
  rates: CostRates,
): number => {
  if (!amount || amount <= 0) return 0;
  const cc = costCurrency || BASE_CURRENCY;
  if (cc === BASE_CURRENCY) return amount;
  const rate = rates[cc];
  if (Number.isFinite(rate) && rate > 0) return amount / rate;
  return amount;
};

/** Non-USD currencies that need a manual rate: the billing currency first (when it is not
 *  USD), followed by every other distinct non-USD currency found in `costCurrenciesInUse`,
 *  in first-seen order. */
export const requiredRateCurrencies = (
  quotationCurrency: string,
  costCurrenciesInUse: string[],
): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();

  if (quotationCurrency !== BASE_CURRENCY) {
    result.push(quotationCurrency);
    seen.add(quotationCurrency);
  }

  for (const cc of costCurrenciesInUse) {
    if (cc === BASE_CURRENCY || seen.has(cc)) continue;
    seen.add(cc);
    result.push(cc);
  }

  return result;
};

/** The billing-currency rate ("1 USD = value <quotationCurrency>"), derived from the rate
 *  map. USD billing is always 1:1. Falls back to 1 when there is no usable rate so a missing
 *  rate never breaks the total display. */
export const billingRate = (quotationCurrency: string, rates: CostRates): number => {
  if (quotationCurrency === BASE_CURRENCY) return 1;
  const rate = rates[quotationCurrency];
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
};

/** Margin on a quotation, measured against the PRE-TAX price.
 *
 *  ITBIS is collected on behalf of the tax authority and never belongs to the company, so
 *  folding it into the base inflates both figures: a quote priced at a 30% margin was being
 *  reported as 40.68% because the tax sat in the numerator and the denominator.
 *
 *  `priceBase` is the subtotal before ITBIS; `costUSD` is the total cost already normalized to
 *  USD. A non-positive base yields 0% rather than dividing by zero. Both results are rounded
 *  to two decimals, matching how they are displayed and persisted. */
export const quotationMargin = (
  priceBase: number,
  costUSD: number,
): { marginUSD: number; marginPercent: number } => ({
  marginUSD: Math.round((priceBase - costUSD) * 100) / 100,
  marginPercent: priceBase > 0 ? Math.round(((priceBase - costUSD) / priceBase) * 10000) / 100 : 0,
});

/** Backward compatibility: older quotations stored a single `exchange_rate` whose currency
 *  was implicit — the billing currency, or DOP when billed in USD. Seed the new per-currency
 *  map from that legacy value so old quotations keep converting costs correctly the first
 *  time they are reopened after this change. */
export const seedRatesFromLegacy = (
  quotationCurrency: string,
  legacyRate: number | undefined,
  rates: CostRates | undefined | null,
): CostRates => {
  if (rates && Object.keys(rates).length > 0) return rates;
  if (Number.isFinite(legacyRate) && (legacyRate as number) > 0 && legacyRate !== 1) {
    const key = quotationCurrency === BASE_CURRENCY ? "DOP" : quotationCurrency;
    return { [key]: legacyRate as number };
  }
  return {};
};
