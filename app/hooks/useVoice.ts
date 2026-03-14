"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Chromium exposes SpeechRecognition under the webkit prefix
declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

const LISTEN_TIMEOUT = 10_000; // Auto-stop after 10s of silence

export function useVoice() {
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
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

      recognition.onresult = (event: SpeechRecognitionEvent) => {
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

        if (final) {
          clearListenTimeout();
          setInterimTranscript("");
          setVoiceState("processing");
          recognitionRef.current = null;
          onResultRef.current?.(final.trim());
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = () => {
        clearListenTimeout();
        setVoiceState("idle");
        setInterimTranscript("");
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        // If we didn't get a final result, reset to idle
        if (recognitionRef.current) {
          clearListenTimeout();
          setVoiceState("idle");
          setInterimTranscript("");
          recognitionRef.current = null;
        }
      };

      recognition.start();

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
