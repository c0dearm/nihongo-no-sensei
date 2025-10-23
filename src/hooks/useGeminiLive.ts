import { useEffect, useRef, useState } from "react";
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Session,
} from "@google/genai";
import konnichiwa from "../sounds/konnichiwa.mp3";
import {
  ChatMessage,
  ChatId,
  ChatMessageId,
  ChatSession,
} from "../utils/types";
import { useChatHistory } from "./useChatHistory";
import MicrophoneStreamer from "../utils/MicrophoneStreamer";
import PcmPlayer from "../utils/PcmPlayer";
import toPCM from "../utils/audio";

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

// Transforms 16 bit PCM little endian audio data into a MediaBlob
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

// Provides the appropriate context to the Gemini model
const getContext = (
  chatSession: ChatSession,
  initialInstruction: string,
): string => {
  const context = `
    You are a friendly and patient Japanese teacher, 日本語の先生. Your student's level is JLPT ${chatSession.jlptLevel}.
    Your goal is to help the student become fluent in spoken Japanese through conversation, by following these rules:
      * You must maintain the conversation using vocabulary, grammar, and topics suitable for the student's level.
      * Speak clearly and at a natural, but not overly fast, pace.
      * If the student makes a significant grammatical or vocabulary error, gently provide a correction.
      * Keep your responses concise to encourage the student to speak more.
      * Be proactive providing topics of conversation to keep the conversation going.
      * Both the student and yourself must talk in Japanese all the time (immersion learning).
    `;

  if (chatSession.messages.length === 0) {
    return `${context}\n${initialInstruction}`;
  } else {
    return `${context}\nUp to now you have had this conversation with the student:\n${chatSession.messages}`;
  }
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
  const chatSession = getChat(chatId) as ChatSession;
  const [messages, setMessages] = useState<ChatMessage[]>(chatSession.messages);

  const sessionPromiseRef = useRef<Promise<Session> | null>(null);
  const micStreamerRef = useRef<MicrophoneStreamer | null>(null);
  const pcmPlayerRef = useRef<PcmPlayer | null>(null);
  const isTriggerWordTurn = useRef<boolean>(true);
  const currentInputRef = useRef<string>("");
  const currentOutputRef = useRef<string>("");

  useEffect(() => {
    setConnectionState(ConnectionState.CONNECTING);
    const client = new GoogleGenAI({ apiKey: geminiApiKey, httpOptions: { "apiVersion": "v1alpha" } });

    sessionPromiseRef.current = client.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      config: {
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
        systemInstruction: getContext(chatSession, initialInstruction),
        responseModalities: [Modality.AUDIO],
        proactivity: { proactiveAudio: true },
        enableAffectiveDialog: true,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: async () => {
          setConnectionState(ConnectionState.CONNECTED);

          // Setup microphone and speakers
          pcmPlayerRef.current = new PcmPlayer();
          micStreamerRef.current = new MicrophoneStreamer((audio) => {
            sessionPromiseRef.current?.then((session) =>
              session.sendRealtimeInput({ media: toBlob(audio) }),
            );
          });
          await pcmPlayerRef.current?.start();
          await micStreamerRef.current?.start();

          // Send trigger word to kickstart the conversation
          toPCM(konnichiwa).then((audio) => {
            sessionPromiseRef.current?.then((session) =>
              session.sendRealtimeInput({ media: toBlob(audio) }),
            );
          });
        },
        onmessage: async (message: LiveServerMessage) => {
          // Handle Input Transcription. The trigger word (first turn) is ignored.
          const inputText = message.serverContent?.inputTranscription?.text;
          if (inputText && !isTriggerWordTurn.current) {
            currentInputRef.current += inputText;
            setCurrentInput(currentInputRef.current);
          }

          // Handle Output Transcription
          const outputText = message.serverContent?.outputTranscription?.text;
          if (outputText) {
            currentOutputRef.current += outputText;
            setCurrentOutput(currentOutputRef.current);
          }

          // Handle Turn Complete. The trigger word (first turn) is ignored.
          if (message.serverContent?.turnComplete) {
            const finalInput = currentInputRef.current.trim();
            const finalOutput = currentOutputRef.current.trim();

            setMessages((prevMessages) => {
              let newMessages = [...prevMessages];
              if (finalInput) {
                if (!isTriggerWordTurn.current) {
                  newMessages.push({
                    id: `student-${Date.now()}` as ChatMessageId,
                    sender: "student",
                    text: finalInput,
                  });
                } else {
                  isTriggerWordTurn.current = false;
                }
              }
              if (finalOutput) {
                newMessages.push({
                  id: `teacher-${Date.now()}` as ChatMessageId,
                  sender: "teacher",
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
  }, [
    geminiApiKey,
    initialInstruction,
    chatId,
    updateChatMessages,
    chatSession,
  ]);

  return { messages, connectionState, currentInput, currentOutput };
};
