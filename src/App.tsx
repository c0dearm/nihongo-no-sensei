import React, { useState, useCallback, useEffect } from "react";
import { JLPTLevel, ChatId } from "./models/types";
import SettingsView from "./views/SettingsView";
import { SettingsProvider } from "./providers/SettingsProvider";
import { useSettings } from "./hooks/useSettings";
import { ChatHistoryProvider } from "./providers/ChatHistoryProvider";
import { useChatHistory } from "./hooks/useChatHistory";
import Header from "./components/Header";
import Main from "./components/Main";
import Layout from "./components/Layout";

const AppContent: React.FC = () => {
  const [activeChatId, setActiveChatId] = useState<ChatId | null>(null);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { startNewChat } = useChatHistory();
  const { settings } = useSettings();

  // Redirect the user to the settings if no API Key is configured
  useEffect(() => {
    if (!settings.geminiApiKey) {
      setIsSettingsOpen(true);
    }
  }, [settings.geminiApiKey]);

  const handleStartNewChat = useCallback(() => {
    setIsCreatingNewChat(true);
  }, []);

  const handleSelectChat = useCallback((chatId: ChatId) => {
    setActiveChatId(chatId);
    setIsCreatingNewChat(false);
  }, []);

  const handleLevelSelect = useCallback(
    (level: JLPTLevel) => {
      const newChat = startNewChat(level);
      setActiveChatId(newChat.id);
      setIsCreatingNewChat(false);
    },
    [startNewChat],
  );

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
          geminiApiKey={settings.geminiApiKey}
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
