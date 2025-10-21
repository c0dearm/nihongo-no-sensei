import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { JLPTLevel, ChatMessage, ChatSession, ChatId, ChatMessageId } from '../models/types';
import { createBlob, AudioPlaybackManager, resampleAndEncodeAudio, AudioInputManager } from '../services/audio';
import { useChatHistory } from '../contexts/ChatHistoryContext';
import {
  TTS_MODEL,
  LIVE_SESSION_MODEL,
  INITIAL_INSTRUCTION_VOICE,
  TEACHER_VOICE,
  OUTPUT_SAMPLE_RATE
} from '../models/constants';

export enum ConnectionState {
  IDLE,
  CONNECTING,
  CONNECTED,
  DISCONNECTED,
  ERROR,
}

interface UseGeminiLiveProps {
  chatId: ChatId;
  initialInstruction: string;
}

export const useGeminiLive = ({ chatId, initialInstruction }: UseGeminiLiveProps) => {
  const { getChat, updateChatMessages } = useChatHistory();
  const chatSession = getChat(chatId) as ChatSession;

  const [messages, setMessages] = useState<ChatMessage[]>(chatSession.messages);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioPlaybackManagerRef = useRef<AudioPlaybackManager | null>(null);
  const audioInputManagerRef = useRef<AudioInputManager | null>(null);
  const currentInputRef = useRef('');
  const currentOutputRef = useRef('');

  const isNewChat = useRef(chatSession.messages.length === 0);

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
                  newMessages.push({ id: `ai-${Date.now()}` as ChatMessageId, sender: 'ai', text: finalOutput });
                }
                isNewChat.current = false;
              } else {
                if (finalInput) {
                  newMessages.push({ id: `user-${Date.now()}` as ChatMessageId, sender: 'user', text: finalInput });
                }
                if (finalOutput) {
                  newMessages.push({ id: `ai-${Date.now()}` as ChatMessageId, sender: 'ai', text: finalOutput });
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

  return { messages, connectionState, currentInput, currentOutput, cleanup };
};
