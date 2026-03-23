/**
 * AudioWorklet processor for smooth, gap-free playback of PCM audio chunks.
 *
 * Receives Int16 PCM buffers via postMessage and outputs them as a continuous
 * Float32 stream. Uses a ring buffer to prevent gaps between chunks.
 */
class AudioPlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Ring buffer — 10 seconds at 24kHz
    this.buffer = new Float32Array(24000 * 10);
    this.writePos = 0;
    this.readPos = 0;
    this.hasData = false;

    this.port.onmessage = (event) => {
      if (event.data === "clear") {
        this.writePos = 0;
        this.readPos = 0;
        this.hasData = false;
        return;
      }

      // Receive Int16 PCM and convert to Float32, write into ring buffer
      const int16 = new Int16Array(event.data);
      for (let i = 0; i < int16.length; i++) {
        this.buffer[this.writePos] = int16[i] / 32768;
        this.writePos = (this.writePos + 1) % this.buffer.length;
      }
      this.hasData = true;
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;

    const channel = output[0];

    for (let i = 0; i < channel.length; i++) {
      if (this.readPos !== this.writePos) {
        channel[i] = this.buffer[this.readPos];
        this.readPos = (this.readPos + 1) % this.buffer.length;
      } else {
        channel[i] = 0; // silence when buffer is empty
        if (this.hasData) {
          // Buffer ran dry — notify main thread
          this.port.postMessage("ended");
          this.hasData = false;
        }
      }
    }

    return true;
  }
}

registerProcessor("audio-playback-processor", AudioPlaybackProcessor);
