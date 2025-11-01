import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from './providers';
import { AppShell } from '@/ui/app-shell';

const FONT_CLASSES = 'fallback-font-inter fallback-font-space-grotesk fallback-font-jetbrains-mono';

export const metadata: Metadata = {
  title: 'Deadlock Buddy',
  description: 'Player insights and hero analytics for Valve’s Deadlock.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background text-foreground">
      <body className={`${FONT_CLASSES} min-h-screen antialiased`}>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
