import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>
      <header className="border-b border-[#e2e8f0] px-6 py-4">
        <Link href="/" className="text-lg font-bold" style={{ color: "#1a8a6e" }}>NAXCAL</Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        {children}
      </main>
      <footer className="border-t border-[#e2e8f0] px-6 py-6 text-center text-xs" style={{ color: "#9ca3af" }}>
        &copy; {new Date().getFullYear()} Naxcal Capital Ltd. All rights reserved.
      </footer>
    </div>
  );
}
