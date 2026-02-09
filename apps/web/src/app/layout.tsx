import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/i18n';

export const metadata: Metadata = {
  title: 'XunDian Manager Dashboard',
  description: 'Smart Field Retail Execution Platform - Manager Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans">
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
