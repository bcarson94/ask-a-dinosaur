import { NextRequest, NextResponse } from "next/server";

const TTS_SYSTEM_PROMPT = `You are Rex, a friendly and slightly goofy Tyrannosaurus Rex talking to children ages 6-12 at a science center.

Voice direction:
- Speak with BIG enthusiasm and energy, like a kids' TV show host
- Use dramatic pauses for comedic effect
- Be playful and a little silly — you're a dinosaur who loves attention
- Vary your pacing: speed up when excited, slow down for dramatic moments
- Sound warm and approachable, never scary`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Use REST API directly for TTS — the SDK doesn't fully support TTS models yet
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text }],
        },
      ],
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
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("Gemini TTS API error:", res.status, errorBody);
      return NextResponse.json(
        { error: `TTS API returned ${res.status}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    const part = data.candidates?.[0]?.content?.parts?.[0];

    if (!part?.inlineData?.data) {
      console.error("No audio data in TTS response:", JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: "Failed to generate audio" },
        { status: 500 }
      );
    }

    // Gemini returns PCM audio (L16, 24kHz, mono) as base64
    const pcmBase64 = part.inlineData.data;
    const pcmBuffer = Buffer.from(pcmBase64, "base64");

    // Wrap PCM data in a WAV header
    const wavBuffer = createWavBuffer(pcmBuffer, 24000, 1, 16);

    return new NextResponse(wavBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wavBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `TTS failed: ${message}` },
      { status: 500 }
    );
  }
}

/** Wrap raw PCM bytes in a WAV (RIFF) header. */
function createWavBuffer(
  pcmData: Buffer,
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number
): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;

  const buffer = Buffer.alloc(fileSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write("WAVE", 8);

  // fmt sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // sub-chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, 44);

  return buffer;
}
