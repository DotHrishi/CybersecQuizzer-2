import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';
import BackgroundGradients from '@/components/BackgroundGradients';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cybersecurity Awareness & Digital Safety Programme',
  description: 'Test your cybersecurity knowledge daily. Earn points, track topic accuracy, and climb the school leaderboard!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.className} min-h-screen flex flex-col justify-between bg-[#f8fafc] text-slate-900`}>
        <ThemeProvider>
          <Toaster
            position="top-right"
            containerStyle={{
              zIndex: 999999,
            }}
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0f172a',
                color: '#f8fafc',
                borderRadius: '0.5rem',
                border: '1px solid #334155',
                fontSize: '12px',
                fontWeight: '600',
                boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
                zIndex: 999999,
              },
            }}
          />
          <BackgroundGradients />
          <Navbar />
          <main className="flex-grow container mx-auto px-4 py-6 max-w-6xl">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}

