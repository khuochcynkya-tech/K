"use client";

import { ChangeEvent, useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  function choose(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setStatus("សូមជ្រើសរូបភាព Chart ប៉ុណ្ណោះ។");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult("");
    setStatus("រូបភាព Chart ត្រូវបានជ្រើសរើស។");
  }

  async function analyze() {
    if (!file) {
      setStatus("សូម Upload Chart ជាមុនសិន។");
      return;
    }

    setLoading(true);
    setResult("");
    setStatus("កំពុងវិភាគ Chart...");

    try {
      const fd = new FormData();
      fd.append("image", file);

      const r = await fetch("/api/analyze", {
        method: "POST",
        body: fd
      });

      const d = await r.json();

      if (!r.ok) throw new Error(d.error || "Analysis failed");

      setResult(d.analysis || "មិនមានលទ្ធផលវិភាគ។");
      setStatus("វិភាគបានជោគជ័យ។");
    } catch (e) {
      setStatus("មានបញ្ហា៖");
      setResult(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <header className="header">
        <h1>🟡 XAUUSD AI V9</h1>
        <p>Upload MT5 Chart → AI Analysis</p>
      </header>

      <section className="card">
        <label className="label">📊 ជ្រើស Chart XAUUSD</label>
        <input
          className="file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={choose}
        />

        {preview && <img className="preview" src={preview} alt="XAUUSD chart preview" />}

        <button className="btn" onClick={analyze} disabled={!file || loading}>
          {loading ? "⏳ កំពុងវិភាគ..." : "🔎 វិភាគ XAUUSD"}
        </button>

        <div className="status">{status}</div>
        <div className="small">
          V9 ផ្តោតលើ Trend, Support/Resistance, Candle Confirmation, Entry, SL, TP និង Risk/Reward។
        </div>
      </section>

      {result && (
        <section className="card">
          <h2>📊 AI Analysis</h2>
          <div className="result">{result}</div>
        </section>
      )}
    </main>
  );
}
