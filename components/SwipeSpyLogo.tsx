// Logo SwipeSpy: stos chevronów (bursztyn) + wordmark Swipe(biały)Spy(bursztyn).
// Rozmiar sterujesz klasą tekstu na wywołaniu (np. text-[1.25rem] w nav,
// text-[2.5rem] w hero) — znak SVG skaluje się z literą przez height: 0.72em.
export function SwipeSpyLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[5px] leading-none ${className}`}>
      <svg viewBox="12 13 36 31" fill="none" aria-hidden style={{ height: '0.72em', width: 'auto' }}>
        <path d="M14 42 L30 28 L46 42" stroke="#EF9F27" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 33 L30 21 L44 33" stroke="#EF9F27" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        <path d="M19 25 L30 15 L41 25" stroke="#EF9F27" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
      </svg>
      <span className="font-bold tracking-[-0.03em]">
        <span className="text-[#f4f5f7]">Swipe</span><span className="text-[#EF9F27]">Spy</span>
      </span>
    </span>
  )
}

export default SwipeSpyLogo
