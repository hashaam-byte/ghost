import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/src/lib/auth-context';
import { GuestTimer } from '@/src/components/guest-timer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ghost - Your AI Life Twin',
  description: 'Level up your life with AI. Gamify everything - school, productivity, crypto, gaming, and more.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <GuestTimer />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}