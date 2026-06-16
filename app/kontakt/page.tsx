import type { Metadata } from 'next'
import { Mail } from 'lucide-react'
import LegalShell, { P } from '@/components/legal/LegalShell'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Kontakt — dropfeed',
  description: 'Skontaktuj się z zespołem dropfeed.',
}

export default function ContactPage() {
  return (
    <LegalShell title="Kontakt">
      <P>Masz pytanie, pomysł albo zgłoszenie? Napisz do nas — odpowiadamy najszybciej, jak się da.</P>

      <a
        href={`mailto:${SITE.contactEmail}`}
        className="mt-4 inline-flex items-center gap-3 rounded-xl border border-line bg-bg-surface px-5 py-4 hover:border-heat/40 transition-colors"
      >
        <span className="w-10 h-10 rounded-full bg-heat/10 flex items-center justify-center shrink-0">
          <Mail size={18} className="text-heat" />
        </span>
        <span>
          <span className="block text-text-lo text-[11px]">E-mail</span>
          <span className="block text-text-hi text-sm font-medium">{SITE.contactEmail}</span>
        </span>
      </a>
    </LegalShell>
  )
}
