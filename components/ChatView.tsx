import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { JLPTLevel, ChatMessage } from '../types';
import { createBlob, AudioPlaybackManager, resampleAndEncodeAudio, AudioInputManager } from '../utils/audio';
import { useChatHistory } from '../contexts/ChatHistoryContext';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import {
  TTS_MODEL,
  LIVE_SESSION_MODEL,
  INITIAL_INSTRUCTION_VOICE,
  TEACHER_VOICE,
  OUTPUT_SAMPLE_RATE
} from '../constants';

enum ConnectionState {
  IDLE,
  CONNECTING,
  CONNECTED,
  DISCONNECTED,
  ERROR,
}

interface ChatViewProps {
  chatId: string;
  onEndChat: () => void;
  initialInstruction: string;
  defaultBlur: boolean;
}

const ChatView: React.FC<ChatViewProps> = ({ chatId, onEndChat, initialInstruction, defaultBlur }) => {
  const { getChat, updateChatMessages } = useChatHistory();
  const chatSession = getChat(chatId);

  const [messages, setMessages] = useState<ChatMessage[]>(chatSession?.messages || []);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  const [isBlurred, setIsBlurred] = useState(defaultBlur);

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioPlaybackManagerRef = useRef<AudioPlaybackManager | null>(null);
  const audioInputManagerRef = useRef<AudioInputManager | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentInputRef = useRef('');
  const currentOutputRef = useRef('');

  const isNewChat = useRef((chatSession?.messages.length ?? 0) === 0);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, currentInput, currentOutput]);

  const getSystemInstruction = (level: JLPTLevel, triggerWord: string, isNew: boolean): string => {
    const baseInstruction = `You are a friendly and patient Japanese teacher, 日本語の先生.
Your student's level is JLPT ${level}.
Your goal is to help the student become fluent in spoken Japanese through conversation.
You must maintain the conversation using vocabulary, grammar, and topics suitable for the ${level} level.
Speak clearly and at a natural, but not overly fast, pace.
If the student makes a significant grammatical error, gently provide a correction after they have finished speaking.
Keep your responses concise to encourage the student to speak more and be proactive providing topics of conversation.`;

    if (isNew) {
      return `The student will start the conversation by saying "${triggerWord}". You must greet them back and ask a simple question appropriate for the ${level} level to get the conversation started.\n${baseInstruction}`;
    } else {
      return `You are resuming a conversation with your student. The student will speak first. You must respond to them naturally to continue the conversation.\n${baseInstruction}`;
    }
  };

  const startSession = useCallback(async () => {
    if (!chatSession) return;
    setConnectionState(ConnectionState.CONNECTING);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      audioPlaybackManagerRef.current = new AudioPlaybackManager(outputAudioContextRef.current);

      audioInputManagerRef.current = new AudioInputManager((pcmData) => {
        const pcmBlob = createBlob(pcmData);
        sessionPromiseRef.current?.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
        });
      });
      await audioInputManagerRef.current.start();

      const sessionPromise = ai.live.connect({
        model: LIVE_SESSION_MODEL,
        callbacks: {
          onopen: async () => {
            setConnectionState(ConnectionState.CONNECTED);

            if (isNewChat.current && outputAudioContextRef.current) {
              const ttsResponse = await ai.models.generateContent({
                model: TTS_MODEL,
                contents: [{ parts: [{ text: initialInstruction }] }],
                config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: INITIAL_INSTRUCTION_VOICE },
                    },
                  },
                },
              });
              const base64Audio24k = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

              if (base64Audio24k) {
                try {
                  const pcmBlob = await resampleAndEncodeAudio(base64Audio24k, outputAudioContextRef.current);
                  sessionPromiseRef.current?.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                  });
                } catch (e) {
                  console.error("Failed to process trigger audio:", e);
                }
              }
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              if (text) {
                currentInputRef.current += text;
                setCurrentInput(currentInputRef.current);
              }
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              if (text) {
                currentOutputRef.current += text;
                setCurrentOutput(currentOutputRef.current);
              }
            }
            if (message.serverContent?.turnComplete) {
              const finalInput = currentInputRef.current.trim();
              const finalOutput = currentOutputRef.current.trim();
              let newMessages = [...messages];

              if (isNewChat.current) {
                if (finalOutput) {
                  newMessages.push({ id: `ai-${Date.now()}`, sender: 'ai', text: finalOutput });
                }
                isNewChat.current = false;
              } else {
                if (finalInput) {
                  newMessages.push({ id: `user-${Date.now()}`, sender: 'user', text: finalInput });
                }
                if (finalOutput) {
                  newMessages.push({ id: `ai-${Date.now()}`, sender: 'ai', text: finalOutput });
                }
              }

              setMessages(newMessages);
              updateChatMessages(chatId, newMessages);

              currentInputRef.current = '';
              currentOutputRef.current = '';
              setCurrentInput('');
              setCurrentOutput('');
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioPlaybackManagerRef.current) {
              await audioPlaybackManagerRef.current.play(base64Audio);
            }

            if (message.serverContent?.interrupted) {
              audioPlaybackManagerRef.current?.stopAll();
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setConnectionState(ConnectionState.ERROR);
          },
          onclose: () => {
            setConnectionState(ConnectionState.DISCONNECTED);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TEACHER_VOICE } } },
          systemInstruction: getSystemInstruction(chatSession.jlptLevel, initialInstruction, isNewChat.current),
        },
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (err) {
      console.error('Failed to start session:', err);
      setConnectionState(ConnectionState.ERROR);
    }
  }, [chatSession, initialInstruction, chatId, updateChatMessages, messages]);

  const cleanup = useCallback(() => {
    sessionPromiseRef.current?.then(session => session.close());
    sessionPromiseRef.current = null;

    audioInputManagerRef.current?.stop();
    audioInputManagerRef.current = null;

    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
    }

    audioPlaybackManagerRef.current?.stopAll();
    audioPlaybackManagerRef.current = null;
  }, []);

  useEffect(() => {
    startSession();
    return () => {
      cleanup();
    };
  }, [startSession, cleanup]);

  const handleStop = () => {
    cleanup();
    onEndChat();
  };

  const toggleBlur = () => {
    setIsBlurred(prev => !prev);
  };

  const renderMessage = (msg: ChatMessage) => (
    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-gray-100 text-light-text dark:bg-gray-700 dark:text-dark-text rounded-bl-none'}`}>
        <p className={`transition-all duration-300 ${isBlurred ? 'blur-sm select-none' : ''}`}>{msg.text}</p>
      </div>
    </div>
  );

  const renderConnectionStatus = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTING:
        return <span className="text-yellow-400">Connecting...</span>;
      case ConnectionState.CONNECTED:
        return <span className="text-secondary flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>Live</span>;
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
          <button onClick={handleStop} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="End chat and go back">
            <ArrowLeftIcon className="w-6 h-6 text-light-text-secondary dark:text-dark-text-secondary" />
          </button>
          <span className="font-semibold text-lg">{chatSession.jlptLevel} Level</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleBlur} className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-white transition-colors" aria-label={isBlurred ? "Show text" : "Blur text"}>
            {isBlurred ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
          <div>{renderConnectionStatus()}</div>
        </div>
      </div>
      <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto">
        {messages.map(renderMessage)}
        {currentInput && !isNewChat.current && <div className="flex justify-end mb-4"><div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl bg-primary text-white rounded-br-none italic"><span className={`transition-all duration-300 ${isBlurred ? 'blur-sm select-none' : ''}`}>{currentInput}</span><MicrophoneIcon className="inline-block w-4 h-4 ml-2 animate-pulse" /></div></div>}
        {currentOutput && <div className="flex justify-start mb-4"><div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl bg-gray-100 text-light-text-secondary dark:bg-gray-700 dark:text-dark-text-secondary rounded-bl-none italic"><span className={`transition-all duration-300 ${isBlurred ? 'blur-sm select-none' : ''}`}>{currentOutput}</span></div></div>}
      </div>
    </div>
  );
};

export default ChatView;
