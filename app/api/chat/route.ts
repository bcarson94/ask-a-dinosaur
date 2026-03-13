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
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        maxOutputTokens: 200,
      },
    });

    // Convert messages to Gemini's history format (all but the last message)
    const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text();

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to get response from Rex" },
      { status: 500 }
    );
  }
}
