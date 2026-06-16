// ════════════════════════════════════════════════════════════════════════
// Edge Function: stripe-webhook — SERCE subskrypcji (Etap 4 C2).
// Stripe → ten endpoint. Weryfikuje podpis i przełącza users.plan.
//
// Deploy z verify_jwt=false (Stripe nie wysyła JWT Supabase). Zapis przez
// service_role (auto-wstrzyknięty SUPABASE_SERVICE_ROLE_KEY — omija RLS;
// po migracji 0008 to JEDYNA ścieżka, którą plan może wskoczyć na 'pro').
//
// Deno + Stripe: fetch HTTP client + constructEventAsync (Web Crypto), bo
// w edge nie ma node:crypto ani node https.
//
// Sekrety (Supabase): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
// Obsługa: checkout.session.completed, customer.subscription.updated/deleted.
// ════════════════════════════════════════════════════════════════════════

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

// Pro tylko gdy subskrypcja realnie aktywna; past_due/unpaid/canceled → free.
const ACTIVE = new Set(['active', 'trialing'])
const planFor = (status: string) => (ACTIVE.has(status) ? 'pro' : 'free')

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('missing stripe-signature', { status: 400 })
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, WEBHOOK_SECRET, undefined, cryptoProvider)
  } catch (err) {
    return new Response(`signature verification failed: ${(err as Error).message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      // Pierwsza płatność: mapujemy usera po client_reference_id (ustawiamy go
      // przy tworzeniu sesji w C3), zapisujemy customer/subscription + plan.
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        const userId = s.client_reference_id
        const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id ?? null
        const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id ?? null
        let status = 'active'
        if (subId) status = (await stripe.subscriptions.retrieve(subId)).status
        if (userId) {
          await supabase.from('users').update({
            plan: planFor(status),
            stripe_customer_id: customerId,
            stripe_subscription_id: subId,
            subscription_status: status,
          }).eq('id', userId)
        } else {
          console.error('checkout.session.completed bez client_reference_id', s.id)
        }
        break
      }

      // Zmiana statusu / anulowanie — szukamy usera po customer_id.
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status
        await supabase.from('users').update({
          plan: planFor(status),
          stripe_subscription_id: sub.id,
          subscription_status: status,
        }).eq('stripe_customer_id', customerId)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('handler error', event.type, err)
    return new Response(`handler error: ${(err as Error).message}`, { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
})
