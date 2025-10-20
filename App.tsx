import React, { useState, useCallback } from 'react';
import { JLPTLevel } from './types';
import LevelSelector from './components/LevelSelector';
import ChatView from './components/ChatView';
import SettingsView from './components/SettingsView';
import HistoryView from './components/HistoryView';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ChatHistoryProvider, useChatHistory } from './contexts/ChatHistoryContext';
import { GearIcon } from './components/icons/GearIcon';

const AppContent: React.FC = () => {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings } = useSettings();
  const { startNewChat } = useChatHistory();

  const handleStartNewChat = useCallback(() => {
    setIsCreatingNewChat(true);
  }, []);

  const handleSelectChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    setIsCreatingNewChat(false);
  }, []);
  
  const handleLevelSelect = useCallback((level: JLPTLevel) => {
    const newChat = startNewChat(level);
    setActiveChatId(newChat.id);
    setIsCreatingNewChat(false);
  }, [startNewChat]);

  const handleEndChat = useCallback(() => {
    setActiveChatId(null);
  }, []);

  const handleBackFromLevelSelect = useCallback(() => {
    setIsCreatingNewChat(false);
  }, []);

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  const renderContent = () => {
    if (activeChatId) {
      return (
        <ChatView
          key={activeChatId} // Add key to force re-mount on chat change
          chatId={activeChatId}
          onEndChat={handleEndChat}
          initialInstruction={settings.initialInstruction}
          defaultBlur={settings.defaultBlur}
        />
      );
    }
    if (isCreatingNewChat) {
      return <LevelSelector onSelectLevel={handleLevelSelect} onBack={handleBackFromLevelSelect} />;
    }
    return <HistoryView onSelectChat={handleSelectChat} onStartNewChat={handleStartNewChat} />;
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg font-sans flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-2xl h-[95vh] max-h-[800px] bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center relative">
          <div className="text-center flex-grow">
            <h1 className="text-2xl font-bold text-light-text dark:text-white">日本語の先生</h1>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Your Japanese Speaking AI Partner</p>
          </div>
          <button
            onClick={openSettings}
            className="absolute right-4 p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-light-text dark:hover:text-white transition-colors"
            aria-label="Open settings"
          >
            <GearIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="flex-grow flex flex-col min-h-0">
          {renderContent()}
        </main>
        {isSettingsOpen && <SettingsView onClose={closeSettings} />}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <ChatHistoryProvider>
        <AppContent />
      </ChatHistoryProvider>
    </SettingsProvider>
  );
};

export default App;
