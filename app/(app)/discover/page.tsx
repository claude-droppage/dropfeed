import { redirect } from 'next/navigation'

// /discover zastąpione przez /products — redirect, żeby stare linki nie dawały 404.
export default function DiscoverPage() {
  redirect('/products')
}
