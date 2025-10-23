import { useEffect, useRef, useState } from "react";
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Session,
} from "@google/genai";
import { ChatMessage, ChatId, ChatMessageId } from "../models/types";
import { useChatHistory } from "./useChatHistory";
import MicrophoneStreamer from "../utils/MicrophoneStreamer";
import PcmPlayer from "../utils/PcmPlayer";

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
  geminiApiKey: string;
}

// Transforms 16 bit PCM little endian audio into a MediaBlob
const toBlob = (pcmAudio: ArrayBuffer) => {
  const view = new Uint8Array(pcmAudio);
  let data = "";
  for (let i = 0; i < view.length; i++) {
    data += String.fromCharCode(view[i]);
  }
  return {
    data: btoa(data),
    mimeType: `audio/pcm;rate=16000`,
  };
};

export const useGeminiLive = ({
  chatId,
  initialInstruction,
  geminiApiKey,
}: UseGeminiLiveProps) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.IDLE,
  );
  const [currentInput, setCurrentInput] = useState<string>("");
  const [currentOutput, setCurrentOutput] = useState<string>("");
  const { getChat, updateChatMessages } = useChatHistory();
  const chatSession = getChat(chatId);
  const [messages, setMessages] = useState<ChatMessage[]>(
    chatSession?.messages || [],
  );

  const sessionPromiseRef = useRef<Promise<Session> | null>(null);
  const micStreamerRef = useRef<MicrophoneStreamer | null>(null);
  const pcmPlayerRef = useRef<PcmPlayer | null>(null);
  const currentInputRef = useRef("");
  const currentOutputRef = useRef("");

  useEffect(() => {
    setConnectionState(ConnectionState.CONNECTING);
    const client = new GoogleGenAI({ apiKey: geminiApiKey });

    sessionPromiseRef.current = client.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      config: {
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
        systemInstruction: initialInstruction || "こんにちは",
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: async () => {
          setConnectionState(ConnectionState.CONNECTED);
          pcmPlayerRef.current = new PcmPlayer();
          micStreamerRef.current = new MicrophoneStreamer((audio) => {
            sessionPromiseRef.current?.then((session) =>
              session.sendRealtimeInput({ media: toBlob(audio) }),
            );
          });

          await pcmPlayerRef.current?.start();
          await micStreamerRef.current?.start();
        },
        onmessage: async (message: LiveServerMessage) => {
          // Handle Input Transcription
          const inputText = message.serverContent?.inputTranscription?.text;
          if (inputText) {
            currentInputRef.current += inputText;
            setCurrentInput(currentInputRef.current);
          }

          // Handle Output Transcription
          const outputText = message.serverContent?.outputTranscription?.text;
          if (outputText) {
            currentOutputRef.current += outputText;
            setCurrentOutput(currentOutputRef.current);
          }

          // Handle Turn Complete
          if (message.serverContent?.turnComplete) {
            const finalInput = currentInputRef.current.trim();
            const finalOutput = currentOutputRef.current.trim();

            setMessages((prevMessages) => {
              let newMessages = [...prevMessages];
              if (finalInput) {
                newMessages.push({
                  id: `user-${Date.now()}` as ChatMessageId,
                  sender: "user",
                  text: finalInput,
                });
              }
              if (finalOutput) {
                newMessages.push({
                  id: `ai-${Date.now()}` as ChatMessageId,
                  sender: "ai",
                  text: finalOutput,
                });
              }
              updateChatMessages(chatId, newMessages);
              return newMessages;
            });

            // Restart partial inputs
            currentInputRef.current = "";
            currentOutputRef.current = "";
            setCurrentInput(currentInputRef.current);
            setCurrentOutput(currentOutputRef.current);
          }

          // Handle Inline Data (Audio)
          const base64Audio =
            message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            const audioData = atob(base64Audio);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const view = new Uint8Array(arrayBuffer);
            for (let i = 0; i < audioData.length; i++) {
              view[i] = audioData.charCodeAt(i);
            }
            pcmPlayerRef.current?.enqueueAudio(arrayBuffer);
          }

          // Handle Interruption
          if (message.serverContent?.interrupted) {
            pcmPlayerRef.current?.stop();
          }
        },
        onclose: (event: CloseEvent) => {
          if (event.reason) {
            console.error("Session closed:", event.reason);
          }

          pcmPlayerRef.current?.stop();
          micStreamerRef.current?.stop();

          pcmPlayerRef.current = null;
          micStreamerRef.current = null;
          sessionPromiseRef.current = null;

          setConnectionState(ConnectionState.DISCONNECTED);
        },
        onerror: (e: ErrorEvent) => {
          console.error("Session error:", e);

          pcmPlayerRef.current?.stop();
          micStreamerRef.current?.stop();

          pcmPlayerRef.current = null;
          micStreamerRef.current = null;
          sessionPromiseRef.current = null;

          setConnectionState(ConnectionState.ERROR);
        },
      },
    });

    // Cleanup
    return () => {
      pcmPlayerRef.current?.stop();
      micStreamerRef.current?.stop();

      pcmPlayerRef.current = null;
      micStreamerRef.current = null;

      sessionPromiseRef.current?.then((session) => {
        session.close();
      });
      sessionPromiseRef.current = null;
    };
  }, [geminiApiKey, initialInstruction, chatId, updateChatMessages]);

  return { messages, connectionState, currentInput, currentOutput };
};
