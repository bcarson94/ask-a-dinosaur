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

const LISTEN_TIMEOUT = 10_000; // Auto-stop after 10s of silence

export function useVoice() {
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const listenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef<((transcript: string) => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Detect STT support on mount
  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognitionCtor);
  }, []);

  const clearListenTimeout = useCallback(() => {
    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current);
      listenTimeoutRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearListenTimeout();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setInterimTranscript("");
  }, [clearListenTimeout]);

  const startListening = useCallback(
    (onResult: (transcript: string) => void) => {
      const SpeechRecognitionCtor =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) return;

      // Cancel any in-progress audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stopListening();

      onResultRef.current = onResult;

      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognitionRef.current = recognition;
      setVoiceState("listening");
      setInterimTranscript("");

      let lastTranscript = "";
      let gotFinalResult = false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        // Track the best transcript we've seen
        lastTranscript = final || interim || lastTranscript;

        if (final) {
          gotFinalResult = true;
          clearListenTimeout();
          setInterimTranscript("");
          setVoiceState("processing");
          recognitionRef.current = null;
          onResultRef.current?.(final.trim());
        } else {
          setInterimTranscript(interim);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e?.error || e);
        // "aborted" fires when we intentionally stop — don't reset state for that
        if (e?.error === "aborted") return;
        clearListenTimeout();
        setVoiceState("idle");
        setInterimTranscript("");
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        // Only act if THIS recognition instance is still the active one
        if (recognitionRef.current !== recognition) return;

        clearListenTimeout();

        // If we got interim text but no final result, submit what we have
        if (!gotFinalResult && lastTranscript.trim()) {
          setInterimTranscript("");
          setVoiceState("processing");
          recognitionRef.current = null;
          onResultRef.current?.(lastTranscript.trim());
        } else if (!gotFinalResult) {
          // No speech detected at all — reset to idle
          setVoiceState("idle");
          setInterimTranscript("");
          recognitionRef.current = null;
        }
      };

      try {
        recognition.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
        setVoiceState("idle");
        recognitionRef.current = null;
      }

      // Safety timeout: auto-stop after 10s
      listenTimeoutRef.current = setTimeout(() => {
        stopListening();
        setVoiceState("idle");
      }, LISTEN_TIMEOUT);
    },
    [stopListening, clearListenTimeout]
  );

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

  const cancelSpeech = useCallback(() => {
    stopListening();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setVoiceState("idle");
  }, [stopListening]);

  return {
    voiceSupported,
    voiceState,
    interimTranscript,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
  };
}
