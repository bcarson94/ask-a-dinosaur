"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Web Speech API types (not included in default TS DOM lib)
/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionType = any;
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionType;
    webkitSpeechRecognition: new () => SpeechRecognitionType;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

export function useVoice() {
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const transcriptRef = useRef("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Detect STT support on mount
  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognitionCtor);
  }, []);

  /** Start recording. Stays on until you call stopAndSubmit or cancelListening. */
  const startListening = useCallback(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    // Cancel any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Reset
    transcriptRef.current = "";
    setTranscript("");

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let full = "";
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      transcriptRef.current = full;
      setTranscript(full);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (e: any) => {
      console.warn("Speech recognition error:", e?.error || e);
      if (e?.error === "aborted") return;
    };

    // If the browser kills recognition (network hiccup, etc), restart it
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        // Browser auto-stopped — restart to keep listening
        try {
          recognition.start();
        } catch {
          // If restart fails, stay in listening state with what we have
        }
      }
    };

    recognitionRef.current = recognition;
    setVoiceState("listening");

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setVoiceState("idle");
      recognitionRef.current = null;
    }
  }, []);

  /** Stop recording and return the accumulated transcript. */
  const stopAndSubmit = useCallback((): string => {
    const text = transcriptRef.current.trim();

    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null; // Clear FIRST so onend won't restart
      try {
        rec.stop();
      } catch {
        // ignore
      }
    }

    setVoiceState(text ? "processing" : "idle");
    setTranscript("");
    transcriptRef.current = "";

    return text;
  }, []);

  /** Cancel recording without submitting. */
  const cancelListening = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.abort();
      } catch {
        // ignore
      }
    }
    setVoiceState("idle");
    setTranscript("");
    transcriptRef.current = "";
  }, []);

  /** Call the Gemini TTS API and play the returned audio. */
  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        // Cancel any currently playing audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        setVoiceState("speaking");

        fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("TTS request failed");
            return res.blob();
          })
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => {
              URL.revokeObjectURL(url);
              audioRef.current = null;
              setVoiceState("idle");
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              audioRef.current = null;
              setVoiceState("idle");
              resolve();
            };

            audio.play().catch(() => {
              URL.revokeObjectURL(url);
              audioRef.current = null;
              setVoiceState("idle");
              resolve();
            });
          })
          .catch(() => {
            setVoiceState("idle");
            resolve();
          });
      });
    },
    []
  );

  /** Cancel everything — listening and audio playback. */
  const cancelSpeech = useCallback(() => {
    cancelListening();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setVoiceState("idle");
  }, [cancelListening]);

  return {
    voiceSupported,
    voiceState,
    transcript,
    startListening,
    stopAndSubmit,
    cancelListening,
    speak,
    cancelSpeech,
  };
}
