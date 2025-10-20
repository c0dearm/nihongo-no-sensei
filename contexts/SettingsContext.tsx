import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AppSettings {
  initialInstruction: string;
  defaultBlur: boolean;
}

interface SettingsContextType {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

const defaultSettings: AppSettings = {
  initialInstruction: 'こんにちは',
  defaultBlur: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettingsState] = useState<AppSettings>(() => {
    try {
      const storedSettings = localStorage.getItem('app-settings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error('Error reading settings from localStorage', error);
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings to localStorage', error);
    }
  }, [settings]);

  const setSettings = (newSettings: AppSettings) => {
    setSettingsState(newSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};