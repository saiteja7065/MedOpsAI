/**
 * Deterministic, rule-based demand forecasting.
 *
 * This deliberately does not ask an LLM to guess a number — a trend line is
 * a math problem, not a language problem, and a hallucinated forecast would
 * be indefensible under scrutiny. The linear regression here decides the
 * number; the paired narrate-forecast edge function only phrases it in
 * plain English, the same "rules decide, AI narrates" split used for the
 * claims denial-risk score.
 */

export interface WeeklyPoint {
  weekStart: string; // ISO date (Monday) of the week
  count: number;
}

export interface TrendPoint {
  label: string;
  weekStart: string;
  value: number;
  isForecast: boolean;
}

export interface ForecastResult {
  points: TrendPoint[];
  weeklyGrowthRate: number; // fractional change per week, e.g. 0.08 = +8%/week
  projectedGrowthPct: number; // total % change from last historical week to the final forecast week
  trend: 'rising' | 'falling' | 'flat';
}

function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Sunday -> 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

export function groupByWeek(appointmentDates: string[]): WeeklyPoint[] {
  const counts = new Map<string, number>();
  for (const dateStr of appointmentDates) {
    const weekStart = startOfIsoWeek(new Date(dateStr + 'T00:00:00Z')).toISOString().split('T')[0];
    counts.set(weekStart, (counts.get(weekStart) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([weekStart, count]) => ({ weekStart, count }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

/** Simple ordinary-least-squares fit of count ~ week index. */
function fitLinear(history: WeeklyPoint[]): { slope: number; intercept: number } {
  const n = history.length;
  const xs = history.map((_, i) => i);
  const ys = history.map(p => p.count);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0);
  const sumX2 = xs.reduce((sum, x) => sum + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function forecastWeeklyVolume(history: WeeklyPoint[], weeksAhead: number): ForecastResult {
  if (history.length < 2) {
    return {
      points: history.map(p => ({ label: p.weekStart, weekStart: p.weekStart, value: p.count, isForecast: false })),
      weeklyGrowthRate: 0,
      projectedGrowthPct: 0,
      trend: 'flat',
    };
  }

  const { slope, intercept } = fitLinear(history);
  const lastHistorical = history[history.length - 1].count;
  const avgLevel = history.reduce((s, p) => s + p.count, 0) / history.length || 1;
  const weeklyGrowthRate = avgLevel > 0 ? slope / avgLevel : 0;

  const historicalPoints: TrendPoint[] = history.map(p => ({
    label: p.weekStart,
    weekStart: p.weekStart,
    value: p.count,
    isForecast: false,
  }));

  const lastDate = new Date(history[history.length - 1].weekStart + 'T00:00:00Z');
  const forecastPoints: TrendPoint[] = [];
  let lastForecastValue = lastHistorical;
  for (let i = 1; i <= weeksAhead; i++) {
    const x = history.length - 1 + i;
    const value = Math.max(0, Math.round(slope * x + intercept));
    const d = new Date(lastDate);
    d.setUTCDate(d.getUTCDate() + i * 7);
    forecastPoints.push({
      label: d.toISOString().split('T')[0],
      weekStart: d.toISOString().split('T')[0],
      value,
      isForecast: true,
    });
    lastForecastValue = value;
  }

  const projectedGrowthPct = lastHistorical > 0
    ? ((lastForecastValue - lastHistorical) / lastHistorical) * 100
    : 0;

  const trend: ForecastResult['trend'] = Math.abs(weeklyGrowthRate) < 0.02 ? 'flat' : weeklyGrowthRate > 0 ? 'rising' : 'falling';

  return {
    points: [...historicalPoints, ...forecastPoints],
    weeklyGrowthRate,
    projectedGrowthPct,
    trend,
  };
}
