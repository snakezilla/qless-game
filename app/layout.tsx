import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Q-Less | Crossword Solitaire',
  description: 'Arrange 12 dice letters into interconnected words. A beautiful word puzzle game.',
  keywords: ['q-less', 'word game', 'puzzle', 'crossword', 'solitaire', 'dice'],
  authors: [{ name: 'Clawdbot' }],
  openGraph: {
    title: 'Q-Less | Crossword Solitaire',
    description: 'Arrange 12 dice letters into interconnected words',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
