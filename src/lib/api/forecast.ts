import { supabase } from '../supabase';

export interface NarrateForecastInput {
  weeklyGrowthRate: number;
  projectedGrowthPct: number;
  trend: 'rising' | 'falling' | 'flat';
  weeksAhead: number;
  lastHistoricalCount?: number;
  lastForecastCount?: number;
  departmentName?: string;
}

export const forecastApi = {
  async narrate(input: NarrateForecastInput): Promise<string> {
    const { data, error } = await supabase.functions.invoke('narrate-forecast', { body: input });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.narration as string;
  },
};
