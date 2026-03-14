"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

export function useVoice() {
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Detect MediaRecorder support on mount
  useEffect(() => {
    setVoiceSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined"
    );
  }, []);

  /** Start recording audio via MediaRecorder. Stays on until stopAndSubmit or cancelListening. */
  const startListening = useCallback(async () => {
    setMicError(null);

    // Cancel any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Get mic stream
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Microphone access error:", err);
      setMicError(
        "Microphone access denied. Please allow microphone access in your browser settings."
      );
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    // Choose a supported mime type
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/mp4";

    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorderRef.current = recorder;
    setVoiceState("listening");

    // Collect data every second so we have chunks ready when user stops
    recorder.start(1000);
  }, []);

  /** Stop recording and send audio to Gemini STT. Returns a promise with the transcript. */
  const stopAndSubmit = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        setVoiceState("idle");
        resolve("");
        return;
      }

      recorder.onstop = async () => {
        // Stop the mic stream
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;

        const chunks = chunksRef.current;
        chunksRef.current = [];

        if (chunks.length === 0) {
          setVoiceState("idle");
          resolve("");
          return;
        }

        const audioBlob = new Blob(chunks, { type: recorder.mimeType });

        // Send to STT API
        setVoiceState("processing");
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          const res = await fetch("/api/stt", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error("STT request failed");

          const data = await res.json();
          const transcript = data.transcript || "";
          resolve(transcript);
        } catch (err) {
          console.error("STT error:", err);
          setMicError("Failed to transcribe audio. Please try again.");
          setVoiceState("idle");
          resolve("");
        }
      };

      recorder.stop();
    });
  }, []);

  /** Cancel recording without submitting. */
  const cancelListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setVoiceState("idle");
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
    micError,
    startListening,
    stopAndSubmit,
    cancelListening,
    speak,
    cancelSpeech,
  };
}
