import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LLaMa Audit - AI Text Detection',
  description: 'Analyze text for AI-generated content using local or cloud LLMs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🦙</span>
                <h1 className="text-xl font-bold text-slate-800">LLaMa Audit</h1>
              </div>
              <nav className="flex items-center gap-4">
                <a href="/" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
                  Analyze
                </a>
                <a href="/history" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
                  History
                </a>
                <a href="/settings" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
                  Settings
                </a>
              </nav>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
