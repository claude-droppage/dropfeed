import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'

// Onboarding wymaga logowania i pokazuje się raz: kto już go przeszedł → /feed.
export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('onboarded')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.onboarded) redirect('/feed')

  return <OnboardingFlow />
}
