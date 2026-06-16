import type { Metadata } from 'next'
import LegalShell, { H2, P, UL } from '@/components/legal/LegalShell'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Polityka prywatności — dropfeed',
  description: 'Jak dropfeed przetwarza dane osobowe (RODO).',
}

export default function PrivacyPage() {
  return (
    <LegalShell title="Polityka prywatności" draft>
      <P>
        Niniejsza polityka opisuje, jakie dane osobowe zbiera serwis {SITE.name} (dalej „Serwis"),
        w jakim celu i na jakiej podstawie, oraz jakie prawa przysługują użytkownikom zgodnie z RODO
        (rozporządzenie UE 2016/679).
      </P>

      <H2>1. Administrator danych</H2>
      <P>
        Administratorem danych jest {SITE.operator}, adres: {SITE.operatorAddress}, {SITE.operatorTaxId}.
        Kontakt w sprawach danych: {SITE.contactEmail}.
      </P>

      <H2>2. Jakie dane przetwarzamy</H2>
      <UL>
        <li><strong>Dane konta:</strong> adres e-mail oraz (przy rejestracji hasłem) zaszyfrowane hasło. Przy logowaniu przez Google — adres e-mail i identyfikator konta Google.</li>
        <li><strong>Preferencje:</strong> wybrane podczas onboardingu cele i nisze, służące do personalizacji feedu.</li>
        <li><strong>Aktywność w Serwisie:</strong> informacja o obejrzanych reklamach (na potrzeby dziennego limitu) oraz zapisane pozycje (tablice).</li>
        <li><strong>Dane techniczne:</strong> niezbędne pliki cookie sesji/logowania oraz standardowe logi serwera (adres IP, typ przeglądarki) u dostawców infrastruktury.</li>
      </UL>
      <P>Serwis nie przetwarza obecnie danych płatniczych — płatności (plan Pro) zostaną uruchomione w późniejszym etapie wraz z odrębną informacją.</P>

      <H2>3. Cele i podstawy prawne</H2>
      <UL>
        <li>Świadczenie usługi i prowadzenie konta — art. 6 ust. 1 lit. b RODO (wykonanie umowy).</li>
        <li>Personalizacja feedu i egzekwowanie limitów planu — art. 6 ust. 1 lit. b oraz lit. f (uzasadniony interes).</li>
        <li>Bezpieczeństwo, zapobieganie nadużyciom, logi techniczne — art. 6 ust. 1 lit. f.</li>
      </UL>

      <H2>4. Odbiorcy danych (procesorzy)</H2>
      <P>Korzystamy z zaufanych dostawców przetwarzających dane w naszym imieniu:</P>
      <UL>
        <li><strong>Supabase</strong> — baza danych, uwierzytelnianie i przechowywanie kont.</li>
        <li><strong>Vercel</strong> — hosting aplikacji i serwowanie stron.</li>
        <li><strong>Cloudflare R2</strong> — hosting plików kreacji reklamowych.</li>
      </UL>
      <P>Część dostawców może przetwarzać dane poza EOG — w takim wypadku odbywa się to na podstawie standardowych klauzul umownych lub równoważnych zabezpieczeń.</P>

      <H2>5. Okres przechowywania</H2>
      <P>Dane konta przechowujemy przez czas posiadania konta. Po jego usunięciu dane są usuwane lub anonimizowane, z wyjątkiem danych, które musimy zachować z mocy prawa lub dla obrony roszczeń.</P>

      <H2>6. Twoje prawa</H2>
      <UL>
        <li>dostęp do danych i ich kopii (art. 15),</li>
        <li>sprostowanie (art. 16),</li>
        <li>usunięcie — „prawo do bycia zapomnianym" (art. 17),</li>
        <li>ograniczenie przetwarzania (art. 18),</li>
        <li>przenoszenie danych (art. 20),</li>
        <li>sprzeciw wobec przetwarzania (art. 21),</li>
        <li>skarga do Prezesa Urzędu Ochrony Danych Osobowych.</li>
      </UL>
      <P>Aby skorzystać z praw, napisz na {SITE.contactEmail}.</P>

      <H2>7. Pliki cookie</H2>
      <P>Używamy wyłącznie niezbędnych plików cookie do utrzymania sesji i logowania. Nie stosujemy obecnie cookies marketingowych ani profilujących stron trzecich.</P>

      <H2>8. Zmiany polityki</H2>
      <P>Politykę możemy aktualizować. O istotnych zmianach poinformujemy w Serwisie lub mailowo. Data ostatniej aktualizacji widnieje na górze strony.</P>
    </LegalShell>
  )
}
