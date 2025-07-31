import "./globals.css";

export const metadata = {
  title: "ETH ⇄ BTC Swap",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
