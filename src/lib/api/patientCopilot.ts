import { supabase } from '../supabase';

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const patientCopilotApi = {
  async chat(message: string, history: CopilotMessage[]): Promise<string> {
    const { data, error } = await supabase.functions.invoke('patient-copilot', {
      body: { message, history },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.response as string;
  },
};
