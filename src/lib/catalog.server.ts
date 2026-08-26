import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function publicClient() {
  const url = process.env["SUPABASE_URL"] || "https://placeholder.supabase.co";
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || "placeholder";
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
