import type { Metadata } from 'next'
import LegalShell, { H2, P, UL } from '@/components/legal/LegalShell'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Regulamin — dropfeed',
  description: 'Regulamin korzystania z serwisu dropfeed.',
}

export default function TermsPage() {
  return (
    <LegalShell title="Regulamin" draft>
      <H2>1. Postanowienia ogólne</H2>
      <P>
        Regulamin określa zasady korzystania z serwisu {SITE.name} (dalej „Serwis"), prowadzonego przez {SITE.operator}.
        Korzystając z Serwisu, akceptujesz niniejszy regulamin.
      </P>

      <H2>2. Definicje</H2>
      <UL>
        <li><strong>Serwis</strong> — aplikacja internetowa {SITE.name} do przeglądania i analizy publicznie dostępnych kreacji reklamowych.</li>
        <li><strong>Użytkownik</strong> — osoba korzystająca z Serwisu po założeniu konta.</li>
        <li><strong>Plan Free / Pro</strong> — warianty dostępu do funkcji Serwisu.</li>
      </UL>

      <H2>3. Charakter usługi</H2>
      <P>
        Serwis udostępnia w formie feedu publicznie dostępne reklamy (m.in. z bibliotek reklam platform społecznościowych)
        wraz z danymi pomocniczymi (np. szacunkowy wskaźnik „heat", staż reklamy, liczba wariantów). Dane mają charakter
        informacyjny i poglądowy — nie stanowią porady inwestycyjnej, prawnej ani gwarancji wyników sprzedażowych.
      </P>

      <H2>4. Konto</H2>
      <UL>
        <li>Do korzystania z Serwisu wymagane jest konto (e-mail i hasło lub logowanie Google).</li>
        <li>Odpowiadasz za poufność danych logowania i działania na koncie.</li>
        <li>Konto jest osobiste — nie udostępniaj go osobom trzecim.</li>
      </UL>

      <H2>5. Plany i limity</H2>
      <UL>
        <li><strong>Free:</strong> dostęp do feedu z dziennym limitem oglądanych reklam (obecnie 20/dzień), deep dive marek i tablic.</li>
        <li><strong>Pro:</strong> nielimitowane przeglądanie i dodatkowe funkcje. Płatności nie są jeszcze uruchomione — do czasu startu Pro funkcja oznaczona jest jako „wkrótce".</li>
      </UL>
      <P>Warunki, ceny i zasady rozliczeń planu Pro zostaną doprecyzowane w odrębnym dokumencie przed uruchomieniem płatności.</P>

      <H2>6. Zasady korzystania</H2>
      <UL>
        <li>Nie wolno automatycznie pobierać danych (scraping), obchodzić limitów ani zakłócać działania Serwisu.</li>
        <li>Nie wolno wykorzystywać Serwisu w sposób niezgodny z prawem lub naruszający prawa osób trzecich.</li>
        <li>Prawa do prezentowanych kreacji należą do ich właścicieli; Serwis udostępnia je w celach analitycznych/informacyjnych.</li>
      </UL>

      <H2>7. Dostępność i odpowiedzialność</H2>
      <P>
        Dokładamy starań, by Serwis działał nieprzerwanie, ale nie gwarantujemy ciągłej dostępności i zastrzegamy prawo do
        przerw technicznych oraz zmian funkcji. W granicach dozwolonych prawem nie odpowiadamy za decyzje biznesowe podjęte
        na podstawie danych z Serwisu.
      </P>

      <H2>8. Reklamacje</H2>
      <P>Reklamacje zgłaszaj na {SITE.contactEmail}. Odpowiemy w rozsądnym terminie, nie dłuższym niż 14 dni.</P>

      <H2>9. Rozwiązanie</H2>
      <P>Możesz w każdej chwili usunąć konto. Możemy zawiesić lub usunąć konto w razie naruszenia regulaminu.</P>

      <H2>10. Zmiany regulaminu</H2>
      <P>Regulamin może ulec zmianie. O istotnych zmianach poinformujemy w Serwisie lub mailowo. Data aktualizacji widnieje na górze strony.</P>
    </LegalShell>
  )
}
