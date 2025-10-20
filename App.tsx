import React, { useState, useCallback } from 'react';
import { JLPTLevel } from './types';
import LevelSelector from './components/LevelSelector';
import ChatView from './components/ChatView';

const App: React.FC = () => {
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel | null>(null);

  const handleLevelSelect = useCallback((level: JLPTLevel) => {
    setSelectedLevel(level);
  }, []);

  const handleEndChat = useCallback(() => {
    setSelectedLevel(null);
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg font-sans flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl h-[95vh] max-h-[800px] bg-dark-surface rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-700">
        <header className="p-4 border-b border-gray-700 text-center">
          <h1 className="text-2xl font-bold text-white">日本語の先生</h1>
          <p className="text-sm text-dark-text-secondary">Your AI Japanese Speaking Partner</p>
        </header>
        <main className="flex-grow flex flex-col min-h-0">
          {selectedLevel ? (
            <ChatView jlptLevel={selectedLevel} onEndChat={handleEndChat} />
          ) : (
            <LevelSelector onSelectLevel={handleLevelSelect} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
