import React, { useState, useEffect, useRef } from "react";
import { useGeminiLive, ConnectionState } from "../hooks/useGeminiLive";
import { useChatHistory } from "../hooks/useChatHistory";
import { ChatMessage, ChatId } from "../models/types";
import { MicrophoneIcon } from "../icons/MicrophoneIcon";
import { EyeIcon } from "../icons/EyeIcon";
import { EyeOffIcon } from "../icons/EyeOffIcon";
import { ArrowLeftIcon } from "../icons/ArrowLeftIcon";

interface ChatViewProps {
  chatId: ChatId;
  onEndChat: () => void;
  initialInstruction: string;
  defaultBlur: boolean;
  geminiApiKey: string;
}

const ChatView: React.FC<ChatViewProps> = ({
  chatId,
  onEndChat,
  initialInstruction,
  defaultBlur,
  geminiApiKey,
}) => {
  const { getChat } = useChatHistory();
  const chatSession = getChat(chatId);

  const { messages, connectionState, currentInput, currentOutput } =
    useGeminiLive({
      chatId,
      initialInstruction,
      geminiApiKey,
    });

  const [isBlurred, setIsBlurred] = useState(defaultBlur);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, currentInput, currentOutput]);

  const handleStop = () => {
    onEndChat();
  };

  const toggleBlur = () => {
    setIsBlurred((prev) => !prev);
  };

  const renderMessage = (msg: ChatMessage) => (
    <div
      key={msg.id}
      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${msg.sender === "user" ? "bg-primary text-white rounded-br-none" : "bg-gray-100 text-light-text dark:bg-gray-700 dark:text-dark-text rounded-bl-none"}`}
      >
        <p
          className={`transition-all duration-300 ${isBlurred ? "blur-xs select-none" : ""}`}
        >
          {msg.text}
        </p>
      </div>
    </div>
  );

  const renderConnectionStatus = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTING:
        return <span className="text-yellow-400">Connecting...</span>;
      case ConnectionState.CONNECTED:
        return (
          <span className="text-secondary flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
            Live
          </span>
        );
      case ConnectionState.DISCONNECTED:
        return <span className="text-gray-500">Disconnected</span>;
      case ConnectionState.ERROR:
        return <span className="text-red-500">Connection Error</span>;
      default:
        return null;
    }
  };

  if (!chatSession) {
    return (
      <div className="flex items-center justify-center h-full text-light-text-secondary dark:text-dark-text-secondary">
        Chat not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-light-surface dark:bg-dark-surface">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={handleStop}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="End chat and go back"
          >
            <ArrowLeftIcon className="w-6 h-6 text-light-text-secondary dark:text-dark-text-secondary" />
          </button>
          <span className="font-semibold text-lg">
            {chatSession.jlptLevel} Level
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleBlur}
            className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-white transition-colors"
            aria-label={isBlurred ? "Show text" : "Blur text"}
          >
            {isBlurred ? (
              <EyeOffIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
          <div>{renderConnectionStatus()}</div>
        </div>
      </div>
      <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto">
        {messages.map(renderMessage)}
        {currentInput && messages.length > 0 && (
          <div className="flex justify-end mb-4">
            <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl bg-primary text-white rounded-br-none italic">
              <span
                className={`transition-all duration-300 ${isBlurred ? "blur-sm select-none" : ""}`}
              >
                {currentInput}
              </span>
              <MicrophoneIcon className="inline-block w-4 h-4 ml-2 animate-pulse" />
            </div>
          </div>
        )}
        {currentOutput && (
          <div className="flex justify-start mb-4">
            <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl bg-gray-100 text-light-text-secondary dark:bg-gray-700 dark:text-dark-text-secondary rounded-bl-none italic">
              <span
                className={`transition-all duration-300 ${isBlurred ? "blur-sm select-none" : ""}`}
              >
                {currentOutput}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;
