import React from 'react';
import { GearIcon } from './icons/GearIcon';

interface HeaderProps {
  openSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ openSettings }) => {
  return (
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
  );
};

export default Header;
