# XAUUSD AI V9

Next.js app for uploading an MT5 XAUUSD chart and getting AI analysis in Khmer.

## Setup

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Put your Groq API key in `GROQ_API_KEY`.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

The API key is used only on the server in `/app/api/analyze/route.ts`.
