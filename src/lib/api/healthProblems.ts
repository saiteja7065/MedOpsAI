import { supabase } from '../supabase';
import type { HealthProblem } from '../../types';

export const healthProblemsApi = {
  async getAll(): Promise<HealthProblem[]> {
    const { data, error } = await supabase
      .from('health_problems')
      .select('*, department:departments(*)')
      .eq('is_active', true)
      .order('category', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getByDepartment(departmentId: string): Promise<HealthProblem[]> {
    const { data, error } = await supabase
      .from('health_problems')
      .select('*, department:departments(*)')
      .eq('department_id', departmentId)
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  },
};
