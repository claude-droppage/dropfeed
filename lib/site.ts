// Dane wykorzystywane na stronach prawnych i kontaktowej.
// Jedno miejsce do edycji — po rejestracji domeny i ustaleniu operatora podmień
// poniższe wartości (e-mail, dane operatora). Reszta stron czyta stąd.
export const SITE = {
  name: 'SwipeSpy',
  // Domena swipespy.io; skrzynka contact@swipespy.io (przekierowanie skonfigurowane)
  contactEmail: 'contact@swipespy.io',
  // TODO: dane operatora (RODO) — uzupełnić przed launchem
  operator: '[do uzupełnienia — nazwa / forma prawna operatora]',
  operatorAddress: '[do uzupełnienia — adres]',
  operatorTaxId: '[do uzupełnienia — NIP / REGON]',
  lastUpdated: '16 czerwca 2026',
} as const
