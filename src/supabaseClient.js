import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://tmgpjzbhpafbemkqofds.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtZ3BqemJocGFmYmVta3FvZmRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMTEzMjEsImV4cCI6MjA1Nzg4NzMyMX0.HAd63HiHg6mwtYKq6GWFAffarbvuOEL_F6Vrem4P9Gg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
