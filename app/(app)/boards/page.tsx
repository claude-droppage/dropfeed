import { pl } from '@/lib/i18n/pl'

export default function BoardsPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3">
      <p className="text-text-hi text-lg font-medium">{pl.boards.title}</p>
      <p className="text-text-lo text-sm">{pl.boards.soon}</p>
    </div>
  )
}
