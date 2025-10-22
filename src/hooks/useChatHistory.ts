import { useContext } from "react";
import {
  ChatHistoryContext,
  ChatHistoryContextType,
} from "../contexts/ChatHistoryContext";

export const useChatHistory = (): ChatHistoryContextType => {
  const context = useContext(ChatHistoryContext);
  if (!context) {
    throw new Error("useChatHistory must be used within a ChatHistoryProvider");
  }
  return context;
};
