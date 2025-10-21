import React from 'react';
import { JLPTLevel } from '../types';
import LevelSelector from './LevelSelector';
import ChatView from './ChatView';
import HistoryView from './HistoryView';

interface MainContentProps {
  activeChatId: string | null;
  isCreatingNewChat: boolean;
  handleSelectChat: (chatId: string) => void;
  handleStartNewChat: () => void;
  handleLevelSelect: (level: JLPTLevel) => void;
  handleEndChat: () => void;
  handleBackFromLevelSelect: () => void;
  initialInstruction: string;
  defaultBlur: boolean;
}

const MainContent: React.FC<MainContentProps> = ({
  activeChatId,
  isCreatingNewChat,
  handleSelectChat,
  handleStartNewChat,
  handleLevelSelect,
  handleEndChat,
  handleBackFromLevelSelect,
  initialInstruction,
  defaultBlur,
}) => {
  if (activeChatId) {
    return (
      <ChatView
        key={activeChatId}
        chatId={activeChatId}
        onEndChat={handleEndChat}
        initialInstruction={initialInstruction}
        defaultBlur={defaultBlur}
      />
    );
  }
  if (isCreatingNewChat) {
    return <LevelSelector onSelectLevel={handleLevelSelect} onBack={handleBackFromLevelSelect} />;
  }
  return <HistoryView onSelectChat={handleSelectChat} onStartNewChat={handleStartNewChat} />;
};

export default MainContent;
