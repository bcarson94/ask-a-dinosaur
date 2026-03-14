import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Convert to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: audioFile.type || "audio/webm",
          data: base64Audio,
        },
      },
      {
        text: "Transcribe this audio exactly as spoken. Return ONLY the transcribed text, nothing else. If you cannot hear any speech, return an empty string.",
      },
    ]);

    const transcript = result.response.text().trim();

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("STT API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `STT failed: ${message}` },
      { status: 500 }
    );
  }
}
