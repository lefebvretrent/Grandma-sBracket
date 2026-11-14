import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-side Supabase client, used only to listen for live-update
// pings (see components/realtime-refresh.tsx). All data reads and writes
// go through Prisma on the server (src/lib/prisma.ts); the database
// tables are locked to the public API with Row Level Security.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
