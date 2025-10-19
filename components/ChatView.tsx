
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { JLPTLevel, ChatMessage } from '../types';
import { createBlob, decode, decodeAudioData, encode } from '../utils/audio';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

enum ConnectionState {
  IDLE,
  CONNECTING,
  CONNECTED,
  DISCONNECTED,
  ERROR,
}

interface ChatViewProps {
  jlptLevel: JLPTLevel;
  onEndChat: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ jlptLevel, onEndChat }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const outputSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTime = useRef(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentInputRef = useRef('');
  const currentOutputRef = useRef('');
  const isFirstTurnRef = useRef(true);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, currentInput, currentOutput]);

  const getSystemInstruction = (level: JLPTLevel): string => {
    return `You are a friendly and patient Japanese teacher, 日本語の先生.
Your student's level is JLPT ${level}.
Your goal is to help the student become fluent in spoken Japanese through conversation.
1. The student will start the conversation by saying "こんにちは". Greet them back and ask a simple question appropriate for the ${level} level to get the conversation started.
2. Maintain the conversation using vocabulary, grammar, and topics suitable for the ${level} level.
3. Speak clearly and at a natural, but not overly fast, pace.
4. If the student makes a significant grammatical error, gently provide a correction after they have finished speaking.
5. Keep your responses concise to encourage the student to speak more.`;
  };

  const startSession = useCallback(async () => {
    setConnectionState(ConnectionState.CONNECTING);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      // Generate audio for "こんにちは" to kickstart the conversation
      const ttsResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: 'こんにちは' }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              // Use a neutral, standard voice for the initial greeting
              prebuiltVoiceConfig: { voiceName: 'Puck' }, 
            },
          },
        },
      });
      const base64Audio24k = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;


      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            setConnectionState(ConnectionState.CONNECTED);

            // Resample the TTS audio from 24kHz to 16kHz and send it to the live session
            if (base64Audio24k && outputAudioContextRef.current) {
              try {
                // 1. Decode 24kHz TTS audio
                const audioData24k = decode(base64Audio24k);
                const audioBuffer24k = await decodeAudioData(audioData24k, outputAudioContextRef.current, 24000, 1);
                
                // 2. Resample to 16kHz
                const targetSampleRate = 16000;
                const offlineContext = new OfflineAudioContext(
                    audioBuffer24k.numberOfChannels,
                    audioBuffer24k.duration * targetSampleRate,
                    targetSampleRate
                );
                const bufferSource = offlineContext.createBufferSource();
                bufferSource.buffer = audioBuffer24k;
                bufferSource.connect(offlineContext.destination);
                bufferSource.start();
                const resampledBuffer16k = await offlineContext.startRendering();

                // 3. Convert resampled AudioBuffer to Int16 PCM data
                const pcmData = resampledBuffer16k.getChannelData(0);
                const l = pcmData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) {
                    const s = Math.max(-1, Math.min(1, pcmData[i]));
                    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                
                // 4. Create blob and send to live session
                const pcmBlob = {
                    data: encode(new Uint8Array(int16.buffer)),
                    mimeType: 'audio/pcm;rate=16000',
                };
                sessionPromiseRef.current?.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
              } catch (e) {
                  console.error("Failed to process trigger audio:", e);
              }
            }

            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputRef.current += text;
              setCurrentInput(currentInputRef.current);
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputRef.current += text;
              setCurrentOutput(currentOutputRef.current);
            }
            if (message.serverContent?.turnComplete) {
                const finalInput = currentInputRef.current.trim();
                const finalOutput = currentOutputRef.current.trim();

                if (isFirstTurnRef.current) {
                    // This is the first turn. The input is the automatic greeting.
                    // We only want to show the AI's response to start the conversation.
                    setMessages(prev => {
                        const newMessages = [...prev];
                        if (finalOutput) {
                            newMessages.push({ id: `ai-${Date.now()}`, sender: 'ai', text: finalOutput });
                        }
                        return newMessages;
                    });
                    isFirstTurnRef.current = false; // The first turn is now complete
                } else {
                    // Subsequent turns should show both user and AI messages.
                    setMessages(prev => {
                        const newMessages = [...prev];
                        if (finalInput) {
                            newMessages.push({ id: `user-${Date.now()}`, sender: 'user', text: finalInput });
                        }
                        if (finalOutput) {
                            newMessages.push({ id: `ai-${Date.now()}`, sender: 'ai', text: finalOutput });
                        }
                        return newMessages;
                    });
                }
                
                currentInputRef.current = '';
                currentOutputRef.current = '';
                setCurrentInput('');
                setCurrentOutput('');
            }
            
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                const audioContext = outputAudioContextRef.current;
                nextStartTime.current = Math.max(nextStartTime.current, audioContext.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                
                source.onended = () => outputSources.current.delete(source);
                source.start(nextStartTime.current);
                nextStartTime.current += audioBuffer.duration;
                outputSources.current.add(source);
            }

            if (message.serverContent?.interrupted) {
                for (const source of outputSources.current) {
                  source.stop();
                }
                outputSources.current.clear();
                nextStartTime.current = 0;
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
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: getSystemInstruction(jlptLevel),
        },
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (err) {
      console.error('Failed to start session:', err);
      setConnectionState(ConnectionState.ERROR);
    }
  }, [jlptLevel]);

  const cleanup = useCallback(() => {
    sessionPromiseRef.current?.then(session => session.close());
    sessionPromiseRef.current = null;

    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;

    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
    }
    
    for (const source of outputSources.current) {
        source.stop();
    }
    outputSources.current.clear();
  },[]);

  useEffect(() => {
    startSession();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSession]);

  const handleStop = () => {
    cleanup();
    onEndChat();
  };
  
  const renderMessage = (msg: ChatMessage) => (
    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-gray-700 text-dark-text rounded-bl-none'}`}>
        <p>{msg.text}</p>
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


  return (
    <div className="flex flex-col h-full bg-dark-surface">
        <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <span className="font-semibold text-lg">{jlptLevel} Level</span>
            <div>{renderConnectionStatus()}</div>
        </div>
      <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto">
        {messages.map(renderMessage)}
        {currentOutput && <div className="flex justify-start mb-4"><div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl bg-gray-700 text-dark-text-secondary rounded-bl-none italic">{currentOutput}</div></div>}
        {currentInput && !isFirstTurnRef.current && <div className="flex justify-end mb-4"><div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl bg-primary text-white rounded-br-none italic">{currentInput}<MicrophoneIcon className="inline-block w-4 h-4 ml-2 animate-pulse" /></div></div>}
      </div>
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleStop}
          className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition-colors duration-200"
        >
          End Chat
        </button>
      </div>
    </div>
  );
};

export default ChatView;
