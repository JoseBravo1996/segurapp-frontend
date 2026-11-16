/**
 * supabaseClient.js
 * Cliente de conexión a Supabase Realtime para notificaciones en vivo.
 * La app no usa Supabase Auth: el backend emite un JWT de Supabase (/api/realtime/token)
 * con el id del usuario, y RLS hace que cada usuario reciba solo sus propias alertas.
 */
import { createClient } from '@supabase/supabase-js';
import { getToken } from './authStorage';
import * as segurappApi from './segurappApi';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Renovar el token con margen: Realtime lo vuelve a pedir en cada heartbeat (~25 s)
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let cachedSession = null; // { token, userId, expiresAt, backendToken }
let pendingSession = null;

/**
 * Devuelve un token de Realtime válido para el usuario logueado (cacheado hasta cerca de su vencimiento).
 * @returns {Promise<{ token: string, userId: number }>}
 */
export async function getRealtimeSession() {
  const backendToken = await getToken();
  if (!backendToken) throw new Error('Sin sesión iniciada.');

  const isFresh =
    cachedSession &&
    cachedSession.backendToken === backendToken &&
    cachedSession.expiresAt - Date.now() > TOKEN_REFRESH_MARGIN_MS;
  if (isFresh) return cachedSession;

  if (!pendingSession) {
    pendingSession = segurappApi
      .getRealtimeToken()
      .then((data) => {
        cachedSession = {
          token: data.token,
          userId: data.userId,
          expiresAt: new Date(data.expiresAt).getTime(),
          backendToken,
        };
        return cachedSession;
      })
      .finally(() => {
        pendingSession = null;
      });
  }
  return pendingSession;
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      accessToken: async () => {
        try {
          return (await getRealtimeSession()).token;
        } catch {
          return supabaseAnonKey;
        }
      },
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
