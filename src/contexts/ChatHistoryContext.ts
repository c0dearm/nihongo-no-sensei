import { createContext } from "react";
import { ChatSession, JLPTLevel, ChatMessage, ChatId } from "../utils/types";

export interface ChatHistoryContextType {
  chatHistory: ChatSession[];
  startNewChat: (level: JLPTLevel) => ChatSession;
  updateChatMessages: (chatId: ChatId, messages: ChatMessage[]) => void;
  deleteChat: (chatId: ChatId) => void;
  getChat: (chatId: ChatId) => ChatSession | undefined;
}

export const ChatHistoryContext = createContext<
  ChatHistoryContextType | undefined
>(undefined);
