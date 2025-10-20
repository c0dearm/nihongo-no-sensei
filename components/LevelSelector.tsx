import React from 'react';
import { JLPTLevel } from '../types';

interface LevelSelectorProps {
  onSelectLevel: (level: JLPTLevel) => void;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({ onSelectLevel }) => {
  const levels = [JLPTLevel.N5, JLPTLevel.N4, JLPTLevel.N3, JLPTLevel.N2, JLPTLevel.N1];

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <h2 className="text-xl font-semibold mb-2 text-light-text dark:text-white">Welcome!</h2>
      <p className="mb-8 text-light-text-secondary dark:text-dark-text-secondary">Please select your current JLPT level to begin.</p>
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
  );
};

export default LevelSelector;
