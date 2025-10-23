const playerProcessorString = `
  /**
   * This processor receives 16-bit PCM ArrayBuffers from the main thread,
   * queues them, and converts them to 32-bit float samples to
   * fill the audio output buffer as requested by the audio system.
   */
  class PlayerProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.bufferQueue = []; // Queue for incoming ArrayBuffers
      this.currentBuffer = null; // The ArrayBuffer we are currently reading from
      this.currentBufferOffset = 0; // Our read position in the currentBuffer (in bytes)
      this.currentDataView = null; // DataView for the currentBuffer

      // Listen for messages from the main thread
      this.port.onmessage = (event) => {
        // Add the received ArrayBuffer to our queue
        this.bufferQueue.push(event.data);
      };
    }

    /**
     * Tries to get the next 16-bit PCM sample from the queue.
     * @returns {number|null} The sample as a 32-bit float, or null if queue is empty.
     */
    getNextSample() {
      // Check if we have a buffer and if it's been fully read
      if (!this.currentBuffer || this.currentBufferOffset >= this.currentBuffer.byteLength) {
        
        // If queue is empty, we have no more data.
        if (this.bufferQueue.length === 0) {
          return null; // Signal buffer underrun
        }

        // Get the next buffer from the queue
        this.currentBuffer = this.bufferQueue.shift();
        this.currentDataView = new DataView(this.currentBuffer);
        this.currentBufferOffset = 0;
      }

      // Read the next 16-bit sample (little-endian)
      const intSample = this.currentDataView.getInt16(this.currentBufferOffset, true);
      this.currentBufferOffset += 2; // Advance offset by 2 bytes

      // Convert Int16 sample [-32768, 32767] to Float32 sample [-1.0, 1.0]
      // We use 32768 for both positive and negative to be symmetric.
      return intSample / 32768.0;
    }

    process(inputs, outputs, parameters) {
      // We only care about the first output (speakers) and first channel (mono).
      const outputChannel = outputs[0][0];

      // Fill the output buffer (typically 128 samples)
      for (let i = 0; i < outputChannel.length; i++) {
        const sample = this.getNextSample();

        if (sample !== null) {
          // We have data, play it
          outputChannel[i] = sample;
        } else {
          // Buffer underrun, play silence for the rest of this block
          outputChannel[i] = 0.0;
        }
      }

      // Keep the processor alive
      return true;
    }
  }

  registerProcessor('player-processor', PlayerProcessor);
`;

/**
 * Manages the audio playback pipeline using AudioWorklet.
 * 1. Creates a 24kHz AudioContext.
 * 2. Loads a custom AudioWorkletProcessor.
 * 3. Connects the worklet to the speakers.
 * 4. Provides a method 'enqueueAudio' to feed 16-bit PCM data to the worklet.
 */
class PcmPlayer {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private workletBlobUrl: string | null = null;
  private isPlaying: boolean = false;
  private targetSampleRate: number;

  /**
   * @param {number} [targetSampleRate=24000] The target sample rate for the audio context.
   */
  constructor(targetSampleRate: number = 24000) {
    this.targetSampleRate = targetSampleRate;
  }

  /**
   * Creates a Blob URL for the AudioWorklet processor code.
   */
  private createWorkletBlobUrl(): void {
    const blob = new Blob([playerProcessorString], {
      type: "application/javascript",
    });
    this.workletBlobUrl = URL.createObjectURL(blob);
  }

  /**
   * Starts the audio playback pipeline.
   */
  async start(): Promise<void> {
    if (this.isPlaying) {
      console.warn("Playback is already in progress.");
      return;
    }

    try {
      // 1. Create AudioContext at the target sample rate (24kHz)
      this.audioContext = new AudioContext({
        sampleRate: this.targetSampleRate,
      });

      // Resume context if it's suspended (e.g., due to browser policy)
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // 2. Load the AudioWorklet
      this.createWorkletBlobUrl();
      await this.audioContext.audioWorklet.addModule(this.workletBlobUrl!);

      // 3. Create the worklet node
      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        "player-processor",
      );

      // 4. Connect the graph: Worklet -> Speakers
      this.workletNode.connect(this.audioContext.destination);

      this.isPlaying = true;
    } catch (err) {
      console.error("Error starting audio player pipeline:", err);
      throw err; // Re-throw for the caller to handle
    }
  }

  /**
   * Stops the audio playback pipeline and cleans up resources.
   */
  async stop(): Promise<void> {
    if (!this.isPlaying) {
      return;
    }

    try {
      // 1. Disconnect nodes
      this.workletNode!.disconnect(this.audioContext!.destination);

      // 2. Clean up AudioContext
      await this.audioContext!.close();

      // 3. Revoke the Blob URL
      if (this.workletBlobUrl) {
        URL.revokeObjectURL(this.workletBlobUrl);
      }
    } catch (err) {
      console.error("Error stopping audio player pipeline:", err);
    } finally {
      // Reset state
      this.isPlaying = false;
      this.audioContext = null;
      this.workletNode = null;
      this.workletBlobUrl = null;
    }
  }

  /**
   * Enqueues a chunk of 16-bit PCM audio data for playback.
   * @param {ArrayBuffer} pcmData The raw 16-bit little-endian PCM data.
   */
  enqueueAudio(pcmData: ArrayBuffer): void {
    if (!this.isPlaying || !this.workletNode) {
      console.warn("Player is not started. Cannot enqueue audio.");
      return;
    }

    // Post the ArrayBuffer to the worklet.
    // We transfer ownership ([pcmData]) to avoid copying.
    this.workletNode.port.postMessage(pcmData, [pcmData]);
  }

  /**
   * @returns {boolean} Whether the pipeline is currently playing.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export default PcmPlayer;
