import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client. Used for auth (magic link) and
// realtime subscriptions (e.g. presenter view watching for score
// updates). Data reads/writes from server code should go through
// Prisma (see src/lib/prisma.ts) instead.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
