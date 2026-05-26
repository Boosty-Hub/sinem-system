export interface ProjectProgress {
  pct: number;
  oeDate: string | null;
  revenueDate: string | null;
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  reason: "ok" | "missing-dates" | "invalid-range" | "future" | "completed";
}

export const parseFlexibleDate = (s: string | null | undefined): Date | null => {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  const padded = /^\d{4}-\d{2}$/.test(trimmed) ? `${trimmed}-01` : trimmed;
  const d = new Date(padded);
  return isNaN(d.getTime()) ? null : d;
};

export const computeTimeProgress = (
  oeStr: string | null | undefined,
  revenueStr: string | null | undefined,
  startDateStr?: string | null | undefined,
  currentStep?: number,
): ProjectProgress => {
  // Step 11 = project fully delivered
  if ((currentStep ?? 0) >= 11) {
    const oe = parseFlexibleDate(oeStr) ?? parseFlexibleDate(startDateStr);
    const rev = parseFlexibleDate(revenueStr);
    const totalDays = oe && rev ? Math.max(0, Math.round((rev.getTime() - oe.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    return { pct: 100, oeDate: oeStr ?? startDateStr ?? null, revenueDate: revenueStr ?? null, totalDays, elapsedDays: totalDays, remainingDays: 0, reason: "completed" };
  }

  const now = Date.now();
  // Use estimated_oe if it's in the past, otherwise fall back to start_date
  let oe = parseFlexibleDate(oeStr);
  if (!oe || oe.getTime() > now) {
    const sd = parseFlexibleDate(startDateStr);
    if (sd && sd.getTime() <= now) oe = sd;
  }
  const effectiveOeStr = oe ? (oeStr && parseFlexibleDate(oeStr)?.getTime() === oe.getTime() ? oeStr : (startDateStr ?? null)) : null;

  const rev = parseFlexibleDate(revenueStr);
  if (!oe || !rev) {
    return { pct: 0, oeDate: effectiveOeStr ?? null, revenueDate: revenueStr ?? null, totalDays: 0, elapsedDays: 0, remainingDays: 0, reason: "missing-dates" };
  }
  const total = rev.getTime() - oe.getTime();
  if (total <= 0) {
    return { pct: 0, oeDate: effectiveOeStr ?? null, revenueDate: revenueStr ?? null, totalDays: 0, elapsedDays: 0, remainingDays: 0, reason: "invalid-range" };
  }
  const elapsed = now - oe.getTime();
  const totalDays = Math.round(total / (1000 * 60 * 60 * 24));
  if (elapsed < 0) {
    return { pct: 0, oeDate: effectiveOeStr ?? null, revenueDate: revenueStr ?? null, totalDays, elapsedDays: 0, remainingDays: totalDays, reason: "future" };
  }
  if (elapsed >= total) {
    return { pct: 100, oeDate: effectiveOeStr ?? null, revenueDate: revenueStr ?? null, totalDays, elapsedDays: totalDays, remainingDays: 0, reason: "completed" };
  }
  const elapsedDays = Math.round(elapsed / (1000 * 60 * 60 * 24));
  return {
    pct: Math.round((elapsed / total) * 100),
    oeDate: effectiveOeStr ?? null,
    revenueDate: revenueStr ?? null,
    totalDays,
    elapsedDays,
    remainingDays: Math.max(0, totalDays - elapsedDays),
    reason: "ok",
  };
};
