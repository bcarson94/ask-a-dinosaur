import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        maxOutputTokens: 500,
      },
    });

    // Convert messages to Gemini's history format (all but the last message)
    const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Gemini requires the first message in history to be a user message.
    while (history.length && history[0].role !== "user") {
      history.shift();
    }

    const lastMessage = messages[messages.length - 1];

    // Get text response from Gemini
    let text: string;
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastMessage.content);
        text = result.response.text();
        break;
      } catch (err) {
        lastError = err;
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("429") || message.includes("Too Many Requests")) {
          await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        break;
      }
    }

    if (!text!) {
      console.error("Chat API error:", lastError);
      const message = lastError instanceof Error ? lastError.message : String(lastError);
      return NextResponse.json(
        { error: `Failed to get response from Rex (${message})` },
        { status: 500 }
      );
    }

    // Generate TTS audio in parallel — don't block text response
    const audioBase64 = await generateTTSAudio(text, apiKey);

    return NextResponse.json({
      response: text,
      audio: audioBase64, // base64 WAV, or null if TTS failed
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to get response from Rex (${message})` },
      { status: 500 }
    );
  }
}

/** Call Gemini TTS and return base64-encoded WAV, or null on failure. */
async function generateTTSAudio(text: string, apiKey: string): Promise<string | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text }] },
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
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const part = data.candidates?.[0]?.content?.parts?.[0];
    if (!part?.inlineData?.data) return null;

    const pcmBuffer = Buffer.from(part.inlineData.data, "base64");
    const wavBuffer = createWavBuffer(pcmBuffer, 24000, 1, 16);

    // Return as base64 so it can travel in JSON
    return Buffer.from(wavBuffer).toString("base64");
  } catch (e) {
    console.error("TTS generation failed:", e);
    return null;
  }
}

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

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write("WAVE", 8);

  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, 44);

  return buffer;
}
