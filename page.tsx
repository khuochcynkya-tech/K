"use client";

import { useState } from "react";

type Analysis = {
  signal: "BUY" | "SELL" | "WAIT";
  confidence: number;
  timeframe: string;
  entry: string;
  stopLoss: string;
  takeProfit: string;
  support: string;
  resistance: string;
  reason: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("សូម Upload រូប MT5 XAUUSD មុន");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  function chooseFile(f?: File) {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setMessage("សូមប្រើ JPG, PNG ឬ WEBP");
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      setMessage("រូបភាពធំពេក — អតិបរមា 4MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setAnalysis(null);
    setMessage("រួចរាល់ — ជ្រើស Gemini ឬ Groq");
  }

  async function analyzeWith(provider: "gemini" | "groq") {
    if (!file) {
      setMessage("សូម Upload រូប MT5 XAUUSD ជាមុន");
      return;
    }
    setLoading(true);
    setAnalysis(null);
    setMessage(`កំពុងវិភាគដោយ ${provider === "gemini" ? "Gemini" : "Groq"}…`);

    try {
      const body = new FormData();
      body.append("image", file);
      body.append("provider", provider);
      const res = await fetch("/api/analyze", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error?.message || "AI analysis failed");
      setAnalysis(data.analysis);
      setMessage(`វិភាគរួច — ${data.meta.provider} / ${data.meta.model}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "មានបញ្ហា");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="shell">
        <header className="header">
          <span className="badge">XAUUSD AI V9</span>
          <h1>វិភាគរូប MT5 XAUUSD</h1>
          <p className="sub">
            Upload chart → ជ្រើស AI → ទទួល BUY / SELL / WAIT ជាមួយ Entry, SL, TP និង Support/Resistance។
          </p>
        </header>

        <section className="card">
          <label className="upload">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => chooseFile(e.target.files?.[0])}
            />
            {preview ? (
              <img src={preview} alt="MT5 chart preview" />
            ) : (
              <div className="uploadText">
                <strong>ចុចទីនេះដើម្បី Upload រូប MT5</strong>
                JPG / PNG / WEBP — អតិបរមា 4MB
              </div>
            )}
          </label>

          <div className="actions">
            <button className="btn primary" disabled={!file || loading} onClick={() => analyzeWith("gemini")}>
              Gemini<br /><small>AI វិភាគ</small>
            </button>
            <button className="btn primary" disabled={!file || loading} onClick={() => analyzeWith("groq")}>
              Groq<br /><small>AI វិភាគ</small>
            </button>
            <button
              className="btn wait"
              disabled={loading}
              onClick={() => {
                setAnalysis(null);
                setMessage("WAIT — រង់ចាំ Candle Confirmation");
              }}
            >
              WAIT<br /><small>រង់ចាំ</small>
            </button>
          </div>

          <div className={message.includes("failed") || message.startsWith("មាន") ? "status error" : "status"}>
            {message}
          </div>

          {analysis && (
            <div className="result">
              <div className="signal">{analysis.signal} · {analysis.confidence}%</div>
              <div className="grid">
                <div className="metric"><span>Timeframe</span><b>{analysis.timeframe}</b></div>
                <div className="metric"><span>Entry</span><b>{analysis.entry}</b></div>
                <div className="metric"><span>Stop Loss</span><b>{analysis.stopLoss}</b></div>
                <div className="metric"><span>Take Profit</span><b>{analysis.takeProfit}</b></div>
                <div className="metric"><span>Support</span><b>{analysis.support}</b></div>
                <div className="metric"><span>Resistance</span><b>{analysis.resistance}</b></div>
              </div>
              <div className="card">
                <strong>ហេតុផល</strong>
                <p className="reason">{analysis.reason}</p>
              </div>
            </div>
          )}

          <p className="disclaimer">
            ការវិភាគនេះជាព័ត៌មានសម្រាប់ជួយសិក្សា មិនមែនជាការធានាថាតម្លៃនឹងឡើង/ចុះ ឬជាដំបូន្មានហិរញ្ញវត្ថុទេ។
          </p>
        </section>
      </div>
    </main>
  );
}
