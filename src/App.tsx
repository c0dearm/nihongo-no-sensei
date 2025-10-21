import React, { useState, useCallback } from 'react';
import { JLPTLevel } from './types';
import SettingsView from './components/SettingsView';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ChatHistoryProvider, useChatHistory } from './contexts/ChatHistoryContext';
import Header from './components/Header';
import MainContent from './components/MainContent';

const AppContent: React.FC = () => {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { startNewChat } = useChatHistory();
  const { settings } = useSettings();

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

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg font-sans flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-2xl h-[95vh] max-h-[800px] bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        <Header openSettings={openSettings} />
        <main className="flex-grow flex flex-col min-h-0">
          <MainContent
            activeChatId={activeChatId}
            isCreatingNewChat={isCreatingNewChat}
            handleSelectChat={handleSelectChat}
            handleStartNewChat={handleStartNewChat}
            handleLevelSelect={handleLevelSelect}
            handleEndChat={handleEndChat}
            handleBackFromLevelSelect={handleBackFromLevelSelect}
            initialInstruction={settings.initialInstruction}
            defaultBlur={settings.defaultBlur}
          />
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
