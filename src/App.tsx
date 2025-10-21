import React, { useState, useCallback } from 'react';
import { JLPTLevel } from './models/types';
import SettingsView from './views/SettingsView';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ChatHistoryProvider, useChatHistory } from './contexts/ChatHistoryContext';
import Header from './components/Header';
import Main from './components/Main';
import Layout from './components/Layout';

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
    <Layout
      header={<Header openSettings={openSettings} />}
      main={
        <Main
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
      }
      settings={isSettingsOpen && <SettingsView onClose={closeSettings} />}
    />
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
