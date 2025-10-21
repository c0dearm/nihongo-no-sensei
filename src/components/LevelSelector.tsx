import React from 'react';
import { JLPTLevel } from '../types';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface LevelSelectorProps {
  onSelectLevel: (level: JLPTLevel) => void;
  onBack: () => void;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({ onSelectLevel, onBack }) => {
  const levels = [JLPTLevel.N5, JLPTLevel.N4, JLPTLevel.N3, JLPTLevel.N2, JLPTLevel.N1];

  return (
    <div className="flex flex-col h-full">
         <header className="p-4 flex items-center relative flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-2 absolute left-4" aria-label="Go back">
                <ArrowLeftIcon className="w-6 h-6 text-light-text-secondary dark:text-dark-text-secondary" />
            </button>
            <h2 className="text-xl font-bold text-center flex-grow text-light-text dark:text-white">New Chat</h2>
        </header>
        <div className="flex flex-col items-center justify-center flex-grow p-8 text-center">
            <p className="mb-8 text-light-text-secondary dark:text-dark-text-secondary">Please select a JLPT level to begin.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-md">
                {levels.map((level) => (
                <button
                    key={level}
                    onClick={() => onSelectLevel(level)}
                    className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg text-lg font-bold text-light-text dark:text-white hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
                >
                    {level}
                </button>
                ))}
            </div>
        </div>
    </div>
  );
};

export default LevelSelector;
