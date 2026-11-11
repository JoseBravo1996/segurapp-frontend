/**
 * supabaseClient.js
 * Cliente de conexión a Supabase Realtime para notificaciones en vivo.
 * Utiliza variables de entorno públicas y expone el cliente seguro.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

if (!isSupabaseConfigured) {
  console.info(
    '[SupabaseRealtime] EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY no configuradas. Se utilizará polling inteligente como fallback para entornos de desarrollo local.'
  );
}

export default supabase;

