import React, { useState, useEffect } from "react";
import { useSettings } from "../hooks/useSettings";
import { AppSettings, Theme } from "../providers/SettingsProvider";
import { ArrowLeftIcon } from "../icons/ArrowLeftIcon";

interface SettingsViewProps {
  onClose: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onClose }) => {
  const { settings, setSettings } = useSettings();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in on mount
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const handleClose = () => {
    // Only allow closing if API key is set
    if (!settings.geminiApiKey) {
      return;
    }
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation to finish
  };

  const handleChange = <K extends keyof AppSettings>(
    field: K,
    value: AppSettings[K],
  ) => {
    // Explicitly cast setSettings to allow for the updater function pattern.
    // This resolves a TS error where the context-provided type might be too narrow.
    (setSettings as React.Dispatch<React.SetStateAction<AppSettings>>)(
      (prevSettings) => ({ ...prevSettings, [field]: value }),
    );
  };

  const themes: { value: Theme; label: string }[] = [
    { value: "system", label: "System Default" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  return (
    <div
      className={`absolute inset-0 bg-light-surface dark:bg-dark-surface z-10 flex flex-col transition-transform duration-300 ease-in-out transform ${isVisible ? "translate-x-0" : "translate-x-full"}`}
    >
      <div className="w-full h-full flex flex-col text-light-text dark:text-dark-text">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center relative flex-shrink-0">
          <button
            onClick={handleClose}
            className={`p-2 rounded-full transition-colors mr-2 absolute left-4 ${
              settings.geminiApiKey
                ? "hover:bg-gray-100 dark:hover:bg-gray-700 text-light-text dark:text-dark-text"
                : "cursor-not-allowed text-gray-400 dark:text-gray-600"
            }`}
            aria-label="Close settings"
            disabled={!settings.geminiApiKey}
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-center flex-grow text-light-text dark:text-white">
            Settings
          </h2>
        </header>
        <div className="flex-grow p-6 overflow-y-auto space-y-8">
          {/* Theme Setting */}
          <div>
            <label className="block text-lg font-semibold mb-2">Theme</label>
            <div className="flex flex-col sm:flex-row gap-2 rounded-lg p-1 bg-gray-100 dark:bg-gray-800">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => handleChange("theme", theme.value)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors focus:outline-none ${
                    settings.theme === theme.value
                      ? "bg-white dark:bg-gray-700 text-primary dark:text-secondary shadow"
                      : "hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
          {/* Initial Instruction Setting */}
          <div>
            <label
              htmlFor="initialInstruction"
              className="block text-lg font-semibold mb-2"
            >
              Initial Instruction
            </label>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-3">
              Submit extra context to the teacher when starting new
              conversations.
            </p>
            <input
              id="initialInstruction"
              type="text"
              value={settings.initialInstruction}
              onChange={(e) =>
                handleChange("initialInstruction", e.target.value)
              }
              placeholder="こんにちは"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-secondary placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:italic"
            />
          </div>

          {/* Default Blur Setting */}
          <div>
            <label className="flex items-center justify-between text-lg font-semibold cursor-pointer">
              <span>Blur Messages</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.defaultBlur}
                  onChange={(e) =>
                    handleChange("defaultBlur", e.target.checked)
                  }
                  className="sr-only"
                  id="blur-toggle"
                />
                <div
                  className={`block w-14 h-8 rounded-full transition-colors ${settings.defaultBlur ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}
                ></div>
                <div
                  className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${settings.defaultBlur ? "transform translate-x-6" : ""}`}
                ></div>
              </div>
            </label>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">
              You can still toggle this during the chat.
            </p>
          </div>

          {/* Gemini API Key Setting */}
          <div>
            <label
              htmlFor="geminiApiKey"
              className="block text-lg font-semibold mb-2"
            >
              Gemini API Key
            </label>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-3">
              Required for chatting. Get your API key from the{" "}
              <a
                href="https://aistudio.google.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary dark:text-secondary hover:underline"
              >
                Google AI Studio
              </a>
              .
            </p>
            <input
              id="geminiApiKey"
              type="password"
              value={settings.geminiApiKey}
              onChange={(e) => handleChange("geminiApiKey", e.target.value)}
              className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-secondary ${
                !settings.geminiApiKey
                  ? "border-red-500 dark:border-red-400"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              placeholder="Enter your Gemini API key"
              required
            />
            {!settings.geminiApiKey && (
              <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                A Gemini API key is required
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
