import React, { useState } from "react";
import { useChatHistory } from "../hooks/useChatHistory";
import { PlusIcon } from "../icons/PlusIcon";
import { TrashIcon } from "../icons/TrashIcon";
import { ChatId } from "../models/types";

interface HistoryViewProps {
  onSelectChat: (chatId: ChatId) => void;
  onStartNewChat: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({
  onSelectChat,
  onStartNewChat,
}) => {
  const { chatHistory, deleteChat } = useChatHistory();
  const [pendingDeleteId, setPendingDeleteId] = useState<ChatId | null>(null);

  const handleConfirmDelete = (e: React.MouseEvent, chatId: ChatId) => {
    e.stopPropagation();
    deleteChat(chatId);
    setPendingDeleteId(null);
  };

  const handleInitiateDelete = (e: React.MouseEvent, chatId: ChatId) => {
    e.stopPropagation();
    setPendingDeleteId(chatId);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex-shrink-0">
        <button
          onClick={onStartNewChat}
          className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-6 h-6" />
          Start New Chat
        </button>
      </div>
      <div className="flex-grow overflow-y-auto px-4 pb-4">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-light-text-secondary dark:text-dark-text-secondary">
            <p className="text-lg">No chats yet.</p>
            <p>Click &quot;Start New Chat&quot; to begin!</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {chatHistory.map((chat) => (
              <li key={chat.id}>
                <div className="w-full text-left bg-light-bg dark:bg-dark-bg rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 flex justify-between items-center group">
                  <button
                    onClick={() => onSelectChat(chat.id)}
                    className="flex-grow p-4 overflow-hidden text-left"
                  >
                    <p className="font-bold text-light-text dark:text-dark-text">
                      {chat.jlptLevel} Conversation
                    </p>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      {new Date(chat.lastUpdatedAt).toLocaleString()}
                    </p>
                    {chat.messages.length > 0 && (
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1 italic truncate">
                        &quot;{chat.messages[chat.messages.length - 1].text}
                        &quot;
                      </p>
                    )}
                  </button>
                  <div className="pr-4 pl-2 flex-shrink-0">
                    {pendingDeleteId === chat.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleConfirmDelete(e, chat.id)}
                          className="p-2 text-sm font-semibold text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50"
                          aria-label="Confirm delete"
                        >
                          Delete
                        </button>
                        <button
                          onClick={handleCancelDelete}
                          className="p-2 text-sm font-semibold text-gray-600 dark:text-gray-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                          aria-label="Cancel delete"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleInitiateDelete(e, chat.id)}
                        className="p-2 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400 transition-colors"
                        aria-label="Delete chat"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
