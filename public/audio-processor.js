/**
 * AudioWorklet processor that captures raw PCM audio at the AudioContext's
 * sample rate and posts Int16 PCM chunks to the main thread.
 *
 * The AudioContext should be created with { sampleRate: 16000 } so that
 * the data arriving here is already 16 kHz mono — matching what the
 * Gemini Live API expects.
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const float32 = input[0]; // mono channel
    const int16 = new Int16Array(float32.length);

    for (let i = 0; i < float32.length; i++) {
      // Clamp and convert Float32 [-1, 1] → Int16 [-32768, 32767]
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this.port.postMessage(int16.buffer, [int16.buffer]);
    return true;
  }
}

registerProcessor("audio-capture-processor", AudioCaptureProcessor);
