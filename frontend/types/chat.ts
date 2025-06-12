export interface ChatMessage {
  id?: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    title?: string;
    url?: string;
    page?: number;
  }>;
}