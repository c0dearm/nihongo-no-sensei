import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Session,
} from "@google/genai";
import {
  JLPTLevel,
  ChatMessage,
  ChatSession,
  ChatId,
  ChatMessageId,
} from "../models/types";
import {
  TTS_MODEL,
  LIVE_SESSION_MODEL,
  INITIAL_INSTRUCTION_VOICE,
  TEACHER_VOICE,
  OUTPUT_SAMPLE_RATE,
} from "../models/constants";

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

export const useGeminiLive = ({
  chatId,
  initialInstruction,
  geminiApiKey,
}: UseGeminiLiveProps) => {
  // TODO: Implement the hook logic here, use the @google/genai library to manage live sessions
  // Documentation here: https://googleapis.github.io/js-genai/release_docs/index.html
  // Examples: https://ai.google.dev/gemini-api/docs/live
};
