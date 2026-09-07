import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

// When Supabase env vars aren't set, `supabase` stays null and every part of
// the app falls back to the localStorage-backed data layer in `store.ts`.
// Reconnect by setting VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (see .env.example)
// and the same table shapes in `store.ts` will read/write from Postgres instead.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
