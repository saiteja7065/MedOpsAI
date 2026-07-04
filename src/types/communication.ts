export type NotificationType = 'appointment' | 'video_call' | 'prescription' | 'emergency' | 'system' | 'reminder';
export type VideoSessionStatus = 'scheduled' | 'waiting' | 'active' | 'completed' | 'cancelled';

export interface ChatMessage {
  sender: 'patient' | 'doctor';
  message: string;
  timestamp: string;
}

export interface VideoSession {
  id: string;
  appointment_id: string;
  room_id: string;
  patient_id: string;
  doctor_id: string;
  status: VideoSessionStatus;
  scheduled_at: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  recording_url?: string;
  transcript?: string;
  ai_summary?: string;
  chat_messages: ChatMessage[];
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  action_url?: string;
  metadata?: any;
  created_at: string;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface AIConversation {
  id: string;
  user_id: string;
  messages: AIMessage[];
  triage_data?: any;
  session_summary?: string;
  created_at: string;
  updated_at: string;
}
