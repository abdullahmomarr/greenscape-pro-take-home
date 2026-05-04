import './globals.css';

export const metadata = {
  title: 'Greenscape Pro Re-engagement',
  description: 'AI-drafted re-engagement messages awaiting human review',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
