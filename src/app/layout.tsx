import type { Metadata } from "next";
import "./globals.css";
import Navigation from "./components/Navigation";
import { ChannelProvider } from './components/Navigation';

export const metadata: Metadata = {
  title: "YouTube Video Idea Generator",
  description: "Generate creative YouTube video ideas using AI. Get engaging content suggestions for your channel.",
  keywords: ["YouTube", "video ideas", "content creation", "AI", "generator"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ChannelProvider>
          <Navigation />
          {children}
        </ChannelProvider>
      </body>
    </html>
  );
}
