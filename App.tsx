import React, { useState, useCallback } from 'react';
import { JLPTLevel } from './types';
import LevelSelector from './components/LevelSelector';
import ChatView from './components/ChatView';
import SettingsView from './components/SettingsView';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { GearIcon } from './components/icons/GearIcon';

const AppContent: React.FC = () => {
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings } = useSettings();

  const handleLevelSelect = useCallback((level: JLPTLevel) => {
    setSelectedLevel(level);
  }, []);

  const handleEndChat = useCallback(() => {
    setSelectedLevel(null);
  }, []);

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

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
          {selectedLevel ? (
            <ChatView
              jlptLevel={selectedLevel}
              onEndChat={handleEndChat}
              initialInstruction={settings.initialInstruction}
              defaultBlur={settings.defaultBlur}
            />
          ) : (
            <LevelSelector onSelectLevel={handleLevelSelect} />
          )}
        </main>
        {isSettingsOpen && <SettingsView onClose={closeSettings} />}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
};

export default App;
