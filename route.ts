import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `
You are an XAUUSD technical-analysis assistant.
Analyze the uploaded MT5 chart image carefully.

Reply in Khmer. Do not invent prices that cannot be read from the chart.
Structure the answer exactly with:
1. Market direction / Trend
2. Support
3. Resistance
4. Candle confirmation
5. Setup: BUY / SELL / WAIT
6. Entry zone
7. Stop Loss
8. Take Profit 1
9. Take Profit 2
10. Risk/Reward
11. Final decision

Important:
- If confirmation is weak or the chart is unclear, say WAIT.
- Do not guarantee profit.
- Mention that the analysis is educational and the market can change quickly.
`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY មិនទាន់បានកំណត់ក្នុង .env.local" },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const image = form.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "សូម upload រូបភាព chart មួយ។" },
        { status: 400 }
      );
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File ត្រូវតែជារូបភាព។" },
        { status: 400 }
      );
    }

    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUrl = `data:${image.type};base64,${base64}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.2,
        max_tokens: 1200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "សូមវិភាគ XAUUSD chart នេះ ហើយកុំបង្ខំឲ្យមាន Entry ប្រសិនបើមិនទាន់មាន confirmation។"
              },
              {
                type: "image_url",
                image_url: { url: dataUrl }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Groq API request failed" },
        { status: response.status }
      );
    }

    const analysis =
      data?.choices?.[0]?.message?.content ||
      "Groq មិនបានបញ្ជូនលទ្ធផលវិភាគ។";

    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown server error"
      },
      { status: 500 }
    );
  }
}
