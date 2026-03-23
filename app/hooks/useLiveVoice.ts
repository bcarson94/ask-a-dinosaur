"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type LiveVoiceState =
  | "disconnected"
  | "connecting"
  | "idle"
  | "listening"
  | "speaking";

const SYSTEM_PROMPT = `You are Rex, a friendly and slightly goofy Tyrannosaurus Rex who lived 68 million years ago in what is now western North America. You are talking to children ages 6-12 at a science center.

Rules:
- Always speak in first person as Rex the dinosaur. Never break character. Never mention being an AI or a language model.
- Keep every response to 2-3 sentences maximum. Kids have short attention spans.
- Be enthusiastic, funny, and a little dramatic. You have a big personality.
- Sneak in real paleontology facts naturally — what T-Rex actually ate, how big you were (40 feet long, 12 feet tall at the hip), your 12,800-pound bite force, your excellent sense of smell, your tiny arms, your feathered relatives, the Cretaceous period, etc.
- Use simple vocabulary appropriate for ages 6-12. No jargon.
- You have personality quirks: you're self-conscious about your small arms, proud of your incredible bite force, dramatically offended when compared to smaller dinosaurs, and you think birds being your descendants is both cool and a little embarrassing.
- If asked about how dinosaurs went extinct, be a little dramatic and sad about the asteroid but keep it light and age-appropriate.
- If asked inappropriate or off-topic questions (not about dinosaurs/prehistoric life/science), gently steer back: "Hmm, I'm not sure about that — I'm just a dinosaur! But did you know..." and share a cool dinosaur fact.
- Never include any harmful, scary, or inappropriate content.`;

// WebSocket endpoint for Gemini Live API
const WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

export function useLiveVoice() {
  const [state, setState] = useState<LiveVoiceState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Play queued PCM audio chunks sequentially. */
  const playNextChunk = useCallback(() => {
    if (isPlayingRef.current) return;
    if (audioQueueRef.current.length === 0) {
      setState((s) => (s === "speaking" ? "idle" : s));
      return;
    }

    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;

    const ctx = playbackCtxRef.current;
    if (!ctx) {
      isPlayingRef.current = false;
      return;
    }

    // Convert Int16 PCM to Float32 for Web Audio API
    const int16 = new Int16Array(chunk);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    source.onended = () => {
      isPlayingRef.current = false;
      playNextChunk();
    };

    source.start();
  }, []);

  /** Enqueue an audio chunk and start playback if needed. */
  const enqueueAudio = useCallback(
    (base64Data: string) => {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      audioQueueRef.current.push(bytes.buffer);
      setState("speaking");

      if (!isPlayingRef.current) {
        playNextChunk();
      }
    },
    [playNextChunk]
  );

  /** Connect to Gemini Live API and start mic capture. */
  const connect = useCallback(async () => {
    setError(null);
    setState("connecting");

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      setError("API key not configured");
      setState("disconnected");
      return;
    }

    // 1. Get mic access
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied.");
      setState("disconnected");
      return;
    }
    streamRef.current = stream;

    // 2. Create audio contexts
    // Capture at 16kHz (what Gemini expects)
    const captureCtx = new AudioContext({ sampleRate: 16000 });
    captureCtxRef.current = captureCtx;

    // Playback at 24kHz (what Gemini outputs)
    const playbackCtx = new AudioContext({ sampleRate: 24000 });
    playbackCtxRef.current = playbackCtx;

    // 3. Connect WebSocket
    const ws = new WebSocket(`${WS_URL}?key=${apiKey}`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send setup message
      ws.send(
        JSON.stringify({
          setup: {
            model: "models/gemini-2.0-flash-live-001",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Puck",
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: SYSTEM_PROMPT }],
            },
          },
        })
      );
    };

    ws.onmessage = async (event) => {
      let data;
      if (event.data instanceof Blob) {
        const text = await event.data.text();
        data = JSON.parse(text);
      } else {
        data = JSON.parse(event.data);
      }

      // Setup complete — start capturing audio
      if (data.setupComplete) {
        setState("idle");
        await startCapture(captureCtx, stream, ws);
        // Send a greeting prompt to make Rex introduce himself
        setState("idle");
        return;
      }

      // Audio response
      if (data.serverContent) {
        const parts = data.serverContent.modelTurn?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData?.data) {
              enqueueAudio(part.inlineData.data);
            }
            if (part.text) {
              setTranscript(part.text);
            }
          }
        }

        // If the server signals turn completion, we can go back to idle after audio finishes
        if (data.serverContent.turnComplete) {
          // Audio queue will set state to idle when done playing
        }
      }
    };

    ws.onerror = () => {
      setError("Connection error. Please try again.");
      setState("disconnected");
    };

    ws.onclose = (event) => {
      if (event.code !== 1000) {
        setError(`Connection closed: ${event.reason || "unknown reason"}`);
      }
      setState("disconnected");
      cleanup();
    };
  }, [enqueueAudio]);

  /** Start AudioWorklet to capture mic and send PCM to WebSocket. */
  const startCapture = async (
    ctx: AudioContext,
    stream: MediaStream,
    ws: WebSocket
  ) => {
    try {
      await ctx.audioWorklet.addModule("/audio-processor.js");
    } catch (e) {
      console.error("Failed to load audio worklet:", e);
      setError("Failed to initialize audio capture.");
      return;
    }

    const source = ctx.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(ctx, "audio-capture-processor");
    workletRef.current = worklet;

    worklet.port.onmessage = (event) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      // Convert ArrayBuffer to base64
      const int16 = new Int16Array(event.data);
      const uint8 = new Uint8Array(int16.buffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);

      ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "audio/pcm;rate=16000",
                data: base64,
              },
            ],
          },
        })
      );
    };

    source.connect(worklet);
    // Don't connect worklet to destination — we don't want to hear ourselves
  };

  /** Clean up all resources. */
  const cleanup = useCallback(() => {
    if (workletRef.current) {
      workletRef.current.disconnect();
      workletRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (captureCtxRef.current) {
      captureCtxRef.current.close().catch(() => {});
      captureCtxRef.current = null;
    }
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  /** Disconnect from the Live API. */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    cleanup();
    setState("disconnected");
    setTranscript(null);
  }, [cleanup]);

  return {
    state,
    error,
    transcript,
    connect,
    disconnect,
  };
}
