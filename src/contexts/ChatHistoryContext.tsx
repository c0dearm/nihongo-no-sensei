import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ChatSession, JLPTLevel, ChatMessage } from '../models/types';

const CHAT_HISTORY_KEY = 'chat-history';

interface ChatHistoryContextType {
  chatHistory: ChatSession[];
  startNewChat: (level: JLPTLevel) => ChatSession;
  updateChatMessages: (chatId: string, messages: ChatMessage[]) => void;
  deleteChat: (chatId: string) => void;
  getChat: (chatId: string) => ChatSession | undefined;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(undefined);

export const ChatHistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chatHistory, setChatHistory] = useState<ChatSession[]>(() => {
    try {
      const storedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (error) {
      console.error('Error reading chat history from localStorage', error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
    } catch (error) {
      console.error('Error saving chat history to localStorage', error);
    }
  }, [chatHistory]);

  const startNewChat = useCallback((level: JLPTLevel): ChatSession => {
    const now = Date.now();
    const newChat: ChatSession = {
      id: now.toString(),
      jlptLevel: level,
      messages: [],
      createdAt: now,
      lastUpdatedAt: now,
    };
    setChatHistory(prev => [newChat, ...prev]);
    return newChat;
  }, []);

  const updateChatMessages = useCallback((chatId: string, messages: ChatMessage[]) => {
    setChatHistory(prev => {
        const now = Date.now();
        const updatedHistory = prev.map(chat =>
            chat.id === chatId ? { ...chat, messages, lastUpdatedAt: now } : chat
        );
        const chatIndex = updatedHistory.findIndex(chat => chat.id === chatId);
        if (chatIndex > 0) {
            const [chatToMove] = updatedHistory.splice(chatIndex, 1);
            updatedHistory.unshift(chatToMove);
        }
        return updatedHistory;
    });
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
  }, []);

  const getChat = useCallback((chatId: string): ChatSession | undefined => {
    return chatHistory.find(chat => chat.id === chatId);
  }, [chatHistory]);


  return (
    <ChatHistoryContext.Provider value={{ chatHistory, startNewChat, updateChatMessages, deleteChat, getChat }}>
      {children}
    </ChatHistoryContext.Provider>
  );
};

export const useChatHistory = (): ChatHistoryContextType => {
  const context = useContext(ChatHistoryContext);
  if (!context) {
    throw new Error('useChatHistory must be used within a ChatHistoryProvider');
  }
  return context;
};
