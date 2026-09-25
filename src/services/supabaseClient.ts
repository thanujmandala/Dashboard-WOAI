import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ajdukhptxqovziroaizy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZHVraHB0eHFvdnppcm9haXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMjA1OTQsImV4cCI6MjEwNTg5NjU5NH0.DoI3sN-4lGXGiZZrTiewLvk10FrevpATPvlxRDutLq0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
