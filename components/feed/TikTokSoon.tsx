// Stan „TikTok wkrótce" — pokazywany w feedzie, gdy źródło = TikTok (Faza 2).
export default function TikTokSoon() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-3 bg-bg-void">
      <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-line flex items-center justify-center text-3xl">🎬</div>
      <h2 className="text-text-hi text-lg font-semibold">Reklamy TikTok — wkrótce</h2>
      <p className="text-text-mid text-sm max-w-xs leading-relaxed">
        Najpierw Facebook. Reklamy z TikToka dokładamy w kolejnej fazie — zostań z nami.
      </p>
    </div>
  )
}
