
export enum JLPTLevel {
  N5 = 'N5',
  N4 = 'N4',
  N3 = 'N3',
  N2 = 'N2',
  N1 = 'N1',
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}
