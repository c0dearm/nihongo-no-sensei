import React from "react";
import { JLPTLevel, ChatId } from "../models/types";
import LevelSelectorView from "../views/LevelSelectorView";
import ChatView from "../views/ChatView";
import HistoryView from "../views/HistoryView";

interface MainProps {
  activeChatId: ChatId | null;
  isCreatingNewChat: boolean;
  handleSelectChat: (chatId: ChatId) => void;
  handleStartNewChat: () => void;
  handleLevelSelect: (level: JLPTLevel) => void;
  handleEndChat: () => void;
  handleBackFromLevelSelect: () => void;
  initialInstruction: string;
  defaultBlur: boolean;
  geminiApiKey: string;
}

const Main: React.FC<MainProps> = ({
  activeChatId,
  isCreatingNewChat,
  handleSelectChat,
  handleStartNewChat,
  handleLevelSelect,
  handleEndChat,
  handleBackFromLevelSelect,
  initialInstruction,
  defaultBlur,
  geminiApiKey,
}) => {
  if (activeChatId) {
    return (
      <ChatView
        key={activeChatId}
        chatId={activeChatId}
        onEndChat={handleEndChat}
        initialInstruction={initialInstruction}
        defaultBlur={defaultBlur}
        geminiApiKey={geminiApiKey}
      />
    );
  }
  if (isCreatingNewChat) {
    return (
      <LevelSelectorView
        onSelectLevel={handleLevelSelect}
        onBack={handleBackFromLevelSelect}
      />
    );
  }
  return (
    <HistoryView
      onSelectChat={handleSelectChat}
      onStartNewChat={handleStartNewChat}
    />
  );
};

export default Main;
