// Decodes an audio file and returns raw 16bit PCM 16Khz little-endian audio data
const toPCM = async (url: string): Promise<ArrayBuffer> => {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const pcmData = audioBuffer.getChannelData(0);
    const pcm16Data = new Int16Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
        pcm16Data[i] = Math.max(-1, Math.min(1, pcmData[i])) * 32767;
    }
    return pcm16Data.buffer;
};

export default toPCM;