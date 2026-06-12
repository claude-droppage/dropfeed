import { pl } from '@/lib/i18n/pl'

export default function ProfilePage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3">
      <p className="text-text-hi text-lg font-medium">{pl.profile.title}</p>
      <p className="text-text-lo text-sm">{pl.profile.soon}</p>
    </div>
  )
}
