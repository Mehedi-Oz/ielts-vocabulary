const SUPABASE_URL = 'https://ufujxgrvnsgywjhchozc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XKwjz_oy3IuEBem1WgjRPg_NOZY-JNm';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
