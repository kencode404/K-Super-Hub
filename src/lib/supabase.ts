import { createClient } from '@supabase/supabase-js'
import { persistentAuthStorage } from './authStorage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Keep the user signed in across reloads, relaunches, and app switches.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: persistentAuthStorage,
    // The storage key stays the Supabase default (derived from the project
    // ref) so every Kencode app on this origin reads the same session.
    //
    // Implicit is deliberate: an installed PWA hands Google sign-in to the
    // system browser, and PKCE would fail there because the code verifier
    // never leaves the PWA's storage.
    flowType: 'implicit',
  },
})
