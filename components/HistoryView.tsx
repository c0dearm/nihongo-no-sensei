import React from 'react';
import { useChatHistory } from '../contexts/ChatHistoryContext';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';

interface HistoryViewProps {
  onSelectChat: (chatId: string) => void;
  onStartNewChat: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onSelectChat, onStartNewChat }) => {
  const { chatHistory, deleteChat } = useChatHistory();

  const handleDelete = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation(); // Prevent card click
    if (window.confirm('Are you sure you want to delete this chat?')) {
        deleteChat(chatId);
    }
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
            <p>Click "Start New Chat" to begin!</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {chatHistory.map((chat) => (
              <li key={chat.id}>
                <button
                  onClick={() => onSelectChat(chat.id)}
                  className="w-full text-left p-4 bg-light-bg dark:bg-dark-bg rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 flex justify-between items-center group"
                >
                  <div className="overflow-hidden">
                    <p className="font-bold text-light-text dark:text-dark-text">{chat.jlptLevel} Conversation</p>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      {new Date(chat.lastUpdatedAt).toLocaleString()}
                    </p>
                    {chat.messages.length > 0 && (
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1 italic truncate">
                           "{chat.messages[chat.messages.length - 1].text}"
                        </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, chat.id)}
                    className="p-2 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0 ml-2"
                    aria-label="Delete chat"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
