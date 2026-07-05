import { supabase } from '../supabase';

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const adminCopilotApi = {
  async chat(message: string, history: CopilotMessage[]): Promise<string> {
    const { data, error } = await supabase.functions.invoke('admin-copilot', {
      body: { message, history },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.response as string;
  },
};
