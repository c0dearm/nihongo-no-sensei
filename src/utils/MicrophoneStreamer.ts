const pcmProcessorString = `
    /**
     * This processor receives 32-bit float samples from the browser,
     * converts them to 16-bit signed integer (PCM) samples,
     * and posts them back to the main thread as little-endian ArrayBuffers.
     */
    class PcmProcessor extends AudioWorkletProcessor {
        constructor() {
        super();
        }

        process(inputs, outputs, parameters) {
        // We only handle the first input and first channel (mono).
        const inputChannel = inputs[0][0];

        // Guard against empty input, which can happen when stopping.
        if (!inputChannel) {
            return true;
        }

        // Create an ArrayBuffer for the 16-bit PCM data.
        // Each sample is 2 bytes.
        const buffer = new ArrayBuffer(inputChannel.length * 2);
        const dataView = new DataView(buffer);

        // Convert Float32 samples [-1.0, 1.0] to Int16 samples [-32768, 32767]
        // We use 'true' for little-endian byte order.
        for (let i = 0; i < inputChannel.length; i++) {
            const s = Math.max(-1, Math.min(1, inputChannel[i]));
            const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
            dataView.setInt16(i * 2, intSample, true); // true = little-endian
        }

        // Post the ArrayBuffer back to the main thread.
        // We transfer ownership of the buffer to avoid copying.
        this.port.postMessage(buffer, [buffer]);

        // Keep the processor alive.
        return true;
        }
    }

    registerProcessor('pcm-processor', PcmProcessor);
    `;

/**
 * Manages the audio capture pipeline using AudioWorklet.
 * 1. Gets user microphone permission.
 * 2. Creates a 16kHz AudioContext.
 * 3. Loads a custom AudioWorkletProcessor.
 * 4. Connects the microphone source to the worklet.
 * 5. The worklet converts audio to 16-bit PCM and sends it via a callback.
 */
class MicrophoneStreamer {
  // Private class fields
  #audioContext: AudioContext | null = null;
  #mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  #workletNode: AudioWorkletNode | null = null;
  #stream: MediaStream | null = null;
  #workletBlobUrl: string | null = null;
  #isRecording = false;
  #onAudioProcess: (audio: ArrayBuffer) => void;
  #targetSampleRate: number;

  /**
   * @param onAudioProcess Callback function to handle processed audio buffers.
   * @param targetSampleRate The target sample rate for the audio context.
   */
  constructor(
    onAudioProcess: (audio: ArrayBuffer) => void,
    targetSampleRate = 16000,
  ) {
    this.#onAudioProcess = onAudioProcess;
    this.#targetSampleRate = targetSampleRate;
  }

  /**
   * Creates a Blob URL for the AudioWorklet processor code.
   * This allows the class to be self-contained.
   */
  #createWorkletBlobUrl(): void {
    const blob = new Blob([pcmProcessorString], {
      type: "application/javascript",
    });
    this.#workletBlobUrl = URL.createObjectURL(blob);
  }

  /**
   * Starts the audio recording pipeline.
   * Asks for microphone permission.
   */
  async start(): Promise<void> {
    if (this.#isRecording) {
      console.warn("Recording is already in progress.");
      return;
    }

    try {
      // 1. Get microphone stream
      this.#stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.#targetSampleRate, // Hint for the desired sample rate
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Create AudioContext at the target sample rate
      // This is the most reliable way to ensure 16kHz processing.
      this.#audioContext = new AudioContext({
        sampleRate: this.#targetSampleRate,
      });

      // Resume context if it's suspended (common in browsers)
      if (this.#audioContext.state === "suspended") {
        await this.#audioContext.resume();
      }

      // 3. Load the AudioWorklet
      this.#createWorkletBlobUrl();
      if (!this.#workletBlobUrl) {
        throw new Error("Failed to create worklet blob URL.");
      }
      await this.#audioContext.audioWorklet.addModule(this.#workletBlobUrl);

      // 4. Create nodes and connect them
      this.#mediaStreamSource = this.#audioContext.createMediaStreamSource(
        this.#stream,
      );
      this.#workletNode = new AudioWorkletNode(
        this.#audioContext,
        "pcm-processor",
      );

      // 5. Set up the message listener from the worklet
      this.#workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        // event.data is the ArrayBuffer
        this.#onAudioProcess(event.data);
      };

      // Connect the graph: MicSource -> Worklet
      // We don't connect the worklet to the destination (speakers)
      this.#mediaStreamSource.connect(this.#workletNode);

      this.#isRecording = true;
    } catch (err) {
      console.error("Error starting audio pipeline:", err);
      throw err; // Re-throw for the caller to handle
    }
  }

  /**
   * Stops the audio recording pipeline and cleans up resources.
   */
  async stop(): Promise<void> {
    if (!this.#isRecording) {
      return;
    }

    try {
      // 1. Disconnect nodes
      if (this.#mediaStreamSource && this.#workletNode) {
        this.#mediaStreamSource.disconnect(this.#workletNode);
      }

      // 2. Stop all media tracks
      this.#stream?.getTracks().forEach((track) => track.stop());

      // 3. Clean up AudioContext and Worklet
      if (this.#workletNode) {
        this.#workletNode.port.onmessage = null;
      }
      await this.#audioContext?.close();

      // 4. Revoke the Blob URL
      if (this.#workletBlobUrl) {
        URL.revokeObjectURL(this.#workletBlobUrl);
      }
    } catch (err) {
      console.error("Error stopping audio pipeline:", err);
    } finally {
      // Reset state
      this.#isRecording = false;
      this.#audioContext = null;
      this.#mediaStreamSource = null;
      this.#workletNode = null;
      this.#stream = null;
      this.#workletBlobUrl = null;
    }
  }

  /**
   * @returns Whether the pipeline is currently recording.
   */
  getIsRecording(): boolean {
    return this.#isRecording;
  }
}

export default MicrophoneStreamer;
