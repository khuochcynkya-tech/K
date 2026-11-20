import "./globals.css";

export const metadata = {
  title: "XAUUSD AI V9",
  description: "MT5 XAUUSD chart AI analysis"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="km">
      <body>{children}</body>
    </html>
  );
}
