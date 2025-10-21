# 日本語の先生 (Japanese Teacher)

An interactive AI-powered Japanese speaking partner designed to help you achieve fluency. Select your JLPT level and start a real-time, low-latency conversation with Google's Gemini model, receiving live feedback and transcription to practice your listening and speaking skills.

![Japanese Teacher App Screenshot](https://storage.googleapis.com/aistudio-ux-team/prompts/58950/1721759020478.png)

## ✨ Key Features

*   **Real-time AI Conversation**: Engage in natural, spoken conversations with an AI tutor powered by the Gemini Live API.
*   **JLPT Level Selection**: Tailor the conversation's difficulty by choosing a Japanese-Language Proficiency Test (JLPT) level from N5 (beginner) to N1 (advanced).
*   **Live Transcription**: See a real-time transcription of both your speech and the AI's responses.
*   **Listening Practice Mode**: Blur the conversation text to focus solely on your listening comprehension skills. You can toggle the blur at any time.
*   **Chat History**: All your practice sessions are saved, allowing you to review past conversations and track your progress.
*   **Customizable Experience**:
    *   Choose between Light, Dark, or System default themes.
    *   Set a custom "initial instruction" to start each new conversation.
    *   Set the default state for blurring messages.
*   **Responsive Design**: A clean, modern, and responsive UI that works beautifully on any device.

## 🚀 How It Works

This application leverages the power of Google's Gemini API to create a seamless and interactive language-learning experience.

*   **Core Technology**: The app is built with **React** and **TypeScript**.
*   **AI Interaction**:
    *   The real-time conversation is handled by **`gemini-2.5-flash-native-audio-preview-09-2025`** using the **Live API**. This enables a low-latency, audio-in/audio-out stream for a fluid speaking experience.
    *   The initial greeting from the teacher is generated using the **`gemini-2.5-flash-preview-tts`** model.
*   **Audio Processing**: The browser's **Web Audio API** (`AudioContext`, `AudioWorklet`) is used to capture microphone input, process it into the required PCM format, and play back the AI's audio response without gaps or delays.
*   **State Management**: React's Context API is used to manage global state for user settings and chat history.
*   **Local Persistence**: Your settings and chat history are saved directly in your browser using `localStorage`.

## 💻 How to Use the App

1.  **Start a New Chat**: Click the "Start New Chat" button on the main screen.
2.  **Select Your Level**: Choose the JLPT level that matches your current Japanese proficiency.
3.  **Grant Permissions**: Your browser will ask for microphone access. Please allow it to enable the conversation.
4.  **Start Speaking**: The AI teacher will greet you. Simply start speaking Japanese to carry on the conversation.
5.  **Practice Listening**: Click the eye icon (👁️) at the top of the chat view to blur the text and test your listening skills. Click it again to unblur.
6.  **End the Session**: When you're finished, click the back arrow (←) to end the chat. Your conversation will be automatically saved to your history.
7.  **Review History**: From the main screen, you can click on any past conversation to review it.
8.  **Customize Settings**: Click the gear icon (⚙️) to change the theme, default blur setting, and the initial prompt.

## 📁 Project Structure

The codebase is organized into a clean and maintainable structure, with all source code residing in the `src` directory:

```
/
├── src/
│   ├── components/      # Reusable React components (Header, Layout, Main)
│   ├── contexts/        # React Context providers (ChatHistory, Settings)
│   ├── hooks/           # Custom React hooks (useGeminiLive)
│   ├── icons/           # SVG icon components
│   ├── models/          # TypeScript types and constants
│   ├── services/        # Audio processing services
│   ├── views/           # Top-level view components (Chat, History, etc.)
│   ├── App.tsx          # Main application component
│   ├── index.tsx        # React app entry point
│   └── style.css        # Global styles
├── .gitignore
├── index.html
├── package.json
├── README.md
└── vite.config.ts
```

## 💻 Running Locally

To run this application on your local machine for development, you'll need Node.js and a package manager like npm.

**1. Prerequisites**

*   [Node.js](https://nodejs.org/) (version 18 or newer is recommended)
*   A package manager like [npm](https://www.npmjs.com/)
*   A Google Gemini API key. You can obtain one from [Google AI Studio](https://aistudio.google.com/).

**2. Setup & Installation**

1.  **Clone the repository** (or download the source code).

2.  **Provide Your API Key:** Create a file named `.env` in the root of the project folder. **This file should not be committed to version control.** Add your API key to this file:
    ```
    VITE_GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
    ```

3.  **Install dependencies:** Open your terminal in the project root and run:
    ```bash
    npm install
    ```

**3. Run the Application**

Once the installation is complete, you can use the following scripts:

*   **`npm run dev`**: Starts the development server, will run on `http://localhost:5173`.
*   **`npm run build`**: Builds the application for production.
*   **`npm run preview`**: Previews the production build locally.
*   **`npm run lint`**: Lint the project.
