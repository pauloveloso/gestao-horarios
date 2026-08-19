import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      const maxAge = 100 * 365 * 24 * 60 * 60; // 100 years
      document.cookie = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split("//")[1].split(".")[0]}-auth-token=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=${maxAge}; SameSite=Lax; secure`;
    } else if (event === "SIGNED_OUT") {
      document.cookie = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split("//")[1].split(".")[0]}-auth-token=; path=/; max-age=0; SameSite=Lax; secure`;
    }
  });
}
