import { INPUT_SAMPLE_RATE, OUTPUT_SAMPLE_RATE } from '../models/constants';
import { MediaBlob } from '../models/types';

export function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

export function createBlob(data: Float32Array): MediaBlob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
    };
}

export async function resampleAndEncodeAudio(
    base64Audio24k: string,
    outputAudioContext: AudioContext,
): Promise<MediaBlob> {
    const targetSampleRate = INPUT_SAMPLE_RATE;

    // 1. Decode 24kHz TTS audio
    const audioData24k = decode(base64Audio24k);
    const audioBuffer24k = await decodeAudioData(audioData24k, outputAudioContext, OUTPUT_SAMPLE_RATE, 1);

    // 2. Resample to 16kHz
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

    // 4. Create blob
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
    };
}


export class AudioPlaybackManager {
    private audioContext: AudioContext;
    private sources: Set<AudioBufferSourceNode> = new Set();
    private nextStartTime: number = 0;

    constructor(audioContext: AudioContext) {
        this.audioContext = audioContext;
    }

    public async play(base64Audio: string): Promise<void> {
        this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
        const audioBuffer = await decodeAudioData(decode(base64Audio), this.audioContext, OUTPUT_SAMPLE_RATE, 1);
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);

        source.onended = () => this.sources.delete(source);
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
    }

    public stopAll(): void {
        for (const source of this.sources) {
            try {
                source.stop();
            } catch {
                // Ignore errors, e.g. from stopping an already stopped source.
            }
        }
        this.sources.clear();
        this.nextStartTime = 0;
    }
}

const AUDIO_PROCESSOR_CODE = `
class AudioProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const inputChannel = input[0];
            if (inputChannel) {
                // Post the Float32Array of PCM data.
                this.port.postMessage(inputChannel);
            }
        }
        return true; // Keep the processor alive
    }
}
registerProcessor('audio-processor', AudioProcessor);
`;

export class AudioInputManager {
    private onAudioData: (data: Float32Array) => void;
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;

    constructor(onAudioData: (data: Float32Array) => void) {
        this.onAudioData = onAudioData;
    }

    public async start(): Promise<void> {
        if (this.audioContext) {
            console.warn("Audio input is already active.");
            return;
        }

        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioTrack = this.mediaStream.getAudioTracks()[0];
            const sampleRate = audioTrack.getSettings().sampleRate;

            const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
            this.audioContext = new AudioContext({ sampleRate });

            const blob = new Blob([AUDIO_PROCESSOR_CODE], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            await this.audioContext.audioWorklet.addModule(url);
            URL.revokeObjectURL(url);

            this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');
            this.workletNode.port.onmessage = (event) => {
                const pcmData = event.data as Float32Array;
                this.onAudioData(pcmData);
            };

            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.sourceNode.connect(this.workletNode);
            this.workletNode.connect(this.audioContext.destination);

        } catch (error) {
            console.error("Failed to start audio input manager:", error);
            this.stop(); // Clean up on failure
            throw error; // Re-throw to be handled by the caller
        }
    }

    public stop(): void {
        this.mediaStream?.getTracks().forEach(track => track.stop());
        this.mediaStream = null;

        if (this.workletNode) {
            this.workletNode.port.onmessage = null;
            this.workletNode.disconnect();
            this.workletNode = null;
        }

        this.sourceNode?.disconnect();
        this.sourceNode = null;

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        this.audioContext = null;
    }
}
