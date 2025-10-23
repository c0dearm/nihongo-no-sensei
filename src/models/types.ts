export type ChatId = string & { readonly __brand: "ChatId" };
export type ChatMessageId = string & { readonly __brand: "ChatMessageId" };

export enum JLPTLevel {
  N5 = "N5",
  N4 = "N4",
  N3 = "N3",
  N2 = "N2",
  N1 = "N1",
}

export interface ChatMessage {
  id: ChatMessageId;
  sender: "user" | "ai";
  text: string;
}

export interface ChatSession {
  id: ChatId;
  jlptLevel: JLPTLevel;
  messages: ChatMessage[];
  createdAt: number;
  lastUpdatedAt: number;
}
