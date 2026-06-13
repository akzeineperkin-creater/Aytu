import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'YOUR_SUPABASE_URL'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'YOUR_SUPABASE_ANON_KEY'

export function createClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY)
}
