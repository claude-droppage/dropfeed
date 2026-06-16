import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SITE } from '@/lib/site'

// Wspólna oprawa stron prawnych/kontaktu: nagłówek z powrotem na "/", treść,
// stopka. `draft` pokazuje dyskretną notkę „wersja robocza" (do zdjęcia przed launchem).
export default function LegalShell({
  title,
  draft = false,
  children,
}: {
  title: string
  draft?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-bg-void text-text-hi min-h-dvh flex flex-col">
      <header className="border-b border-line">
        <div className="mx-auto max-w-[800px] px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-[17px] tracking-tight">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-heat to-[#f5b955] flex items-center justify-center text-sm">🔥</span>
            {SITE.name}
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-text-mid text-sm hover:text-text-hi transition-colors">
            <ArrowLeft size={15} /> Strona główna
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-[800px] w-full px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
        <p className="text-text-lo text-[13px] mb-8">Ostatnia aktualizacja: {SITE.lastUpdated}</p>

        {draft && (
          <div className="mb-8 rounded-xl border border-heat/30 bg-heat/10 px-4 py-3 text-[13px] text-heat">
            ⚠️ Wersja robocza — treść poglądowa, do weryfikacji prawnej przed publicznym launchem.
          </div>
        )}

        <div className="space-y-1">{children}</div>
      </main>

      <footer className="border-t border-line py-8 bg-bg-surface">
        <div className="mx-auto max-w-[800px] px-6 flex justify-between items-center flex-wrap gap-4 text-sm text-text-lo">
          <div className="flex gap-6">
            <Link href="/prywatnosc" className="hover:text-text-mid transition-colors">Prywatność</Link>
            <Link href="/regulamin" className="hover:text-text-mid transition-colors">Regulamin</Link>
            <Link href="/kontakt" className="hover:text-text-mid transition-colors">Kontakt</Link>
          </div>
          <span className="text-[13px]">© 2026 {SITE.name}</span>
        </div>
      </footer>
    </div>
  )
}

/* ── Prymitywy treści (spójna typografia bez pluginu typography) ───────── */
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-text-hi text-lg font-semibold mt-8 mb-3">{children}</h2>
}
export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-text-mid text-sm leading-relaxed mb-3">{children}</p>
}
export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 text-text-mid text-sm leading-relaxed mb-3 space-y-1.5">{children}</ul>
}
