import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const SYSTEM_PROMPT = `You analyze a single MT5 XAUUSD chart screenshot for educational purposes.
Return ONLY valid JSON with these keys:
signal: BUY | SELL | WAIT
confidence: integer 0-100
timeframe: string
entry: string
stopLoss: string
takeProfit: string
support: string
resistance: string
reason: string

Rules:
- If the chart is unclear, cropped, not XAUUSD, or lacks enough evidence, use WAIT.
- Never invent exact prices that cannot be read from the screenshot. Use "N/A" when unreadable.
- Prefer WAIT when candle confirmation is missing.
- Mention the visible trend, support/resistance and candle confirmation in reason.
- This is not financial advice.`;

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

function parseJson(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI returned invalid JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callGemini(base64: string, mimeType: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: SYSTEM_PROMPT + "\nAnalyze the attached chart now. Output JSON only." }
        ]
      }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
    }),
    signal: AbortSignal.timeout(50000)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Gemini HTTP ${res.status}`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
  if (!text) throw new Error("Gemini returned no text");
  return { text, model };
}

async function callGroq(base64: string, mimeType: string) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is missing");
  const model = process.env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: "text", text: SYSTEM_PROMPT + "\nAnalyze the attached chart now. Output JSON only." }
        ]
      }]
    }),
    signal: AbortSignal.timeout(50000)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Groq HTTP ${res.status}`);
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Groq returned no text");
  return { text, model };
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return fail("សំណើមិនត្រឹមត្រូវ", 400);

  const file = form.get("image");
  const provider = form.get("provider");

  if (!(file instanceof File)) return fail("សូម Upload រូប MT5 XAUUSD", 400);
  if (!TYPES.has(file.type)) return fail("សូមប្រើ JPG, PNG ឬ WEBP", 415);
  if (file.size === 0) return fail("រូបភាពទទេ", 400);
  if (file.size > MAX_BYTES) return fail("រូបភាពធំពេក — អតិបរមា 4MB", 413);
  if (provider !== "gemini" && provider !== "groq") return fail("Provider មិនត្រឹមត្រូវ", 400);

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    const result = provider === "gemini"
      ? await callGemini(base64, file.type)
      : await callGroq(base64, file.type);

    const analysis = parseJson(result.text);
    return NextResponse.json({
      ok: true,
      analysis,
      meta: { provider, model: result.model, analyzedAt: new Date().toISOString() }
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[v9 analyze]", error);
    return fail(error instanceof Error ? error.message : "AI analysis failed", 502);
  }
}
