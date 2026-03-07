import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error('❌ ERREUR CATALITIQUE : Les clés Supabase sont manquantes dans le fichier .env');
    process.exit(1);
}

/**
 * 👤 Client Supabase Standard (Anon Key)
 * Conçu pour interagir avec Supabase en respectant les règles RLS (Row Level Security).
 * Il faut lui passer l'Auth Headers (JWT) du manager actif pour qu'il ne lise que ses données.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 🛡️ Client Supabase Admin (Service Role Key)
 * Conçu pour les opérations Backend critiques (ex: Webhooks FedaPay).
 * Il CONTOURNE le RLS (Full Admin Access). Ne transmettez jamais cette instance au front-end.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});
