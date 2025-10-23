import { createContext } from "react";
import { AppSettings } from "../providers/SettingsProvider";

export interface SettingsContextType {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);
