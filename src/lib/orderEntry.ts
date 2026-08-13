/**
 * Order Entry status rules for the analytics dashboard. Extracted from Analitica so the
 * rules are unit-testable in isolation, with no dependency on React or Supabase types.
 *
 * Order Entry measures orders BOOKED in a year, keyed by each opportunity's Estimated OE
 * date. An opportunity that has already been invoiced is booked Order Entry — it is the
 * most certain kind there is, so it belongs in the forecast, not outside it.
 */

/** Statuses whose Order Entry is already closed: the order is booked and no longer at risk.
 *  `cerrados` is legacy and no longer produced by the CRM, but old rows may still carry it. */
export const WON_STATUSES = ["ganado", "facturada", "cerrados"] as const;

/** Statuses that never contribute Order Entry, because the order was never booked. */
export const DEAD_STATUSES = ["perdido", "cancelado"] as const;

export const isWonStatus = (status: string): boolean =>
  (WON_STATUSES as readonly string[]).includes(status);

export const isDeadStatus = (status: string): boolean =>
  (DEAD_STATUSES as readonly string[]).includes(status);

/** What an opportunity contributes to the Order Entry forecast.
 *
 *  Closed business counts at its FULL price: a booked order has no probability left to
 *  weight, so discounting it by `probability` would understate a number that is already
 *  certain. Open pipeline counts at its weighted value (price × probability). */
export const orderEntryContribution = (
  p: { status: string; priceUSD: number; weighted: number },
): number => (isWonStatus(p.status) ? p.priceUSD : p.weighted);
