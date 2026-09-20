// Supabase connection for the I&C Plant Desk.
// These are public (publishable) values and are safe to keep in the code —
// all data protection is enforced by Row Level Security in the database.
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://uofqtighrficycyxwacz.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_mwRrxy1fEgu1F1kAtRkPfw_kNeucPdK";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "plantdesk-auth",
  },
});

export default supabase;
