import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ClientRoot } from '@/components/client-root';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: {
    template: '%s | GOD IS ABLE GLOBAL LINK',
    default: 'GOD IS ABLE GLOBAL LINK',
  },
  description: 'Your personalized investment dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} dark`}>
      <body className="font-body antialiased bg-background">
        <ClientRoot>
          {children}
        </ClientRoot>
      </body>
    </html>
  );
}
