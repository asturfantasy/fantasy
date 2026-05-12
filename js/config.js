/* ============================================================
   js/config.js
   ⚠️ EDITA SOLO ESTE ARCHIVO para conectar con tu Supabase.
   Los valores los encuentras en:
   Supabase → Settings → API
   ============================================================ */

const SUPABASE_URL = 'https://rtmclmqzasktshlzwcyn.supabase.co';   // ← cambia esto
const SUPABASE_KEY = 'sb_publishable_8aNRtGX0cHoNcaJHv9ASOw_Fz-3Of-2';                // ← cambia esto

// Número de jornada activa. Cámbialo cada semana.
const JORNADA_ACTIVA = 1;

// Partidos de la semana. Actualiza el array cada jornada.
// color: código hex del color principal del equipo
const PARTIDOS = [
  {
    local:     { nombre: 'Mosconia',       abrev: 'MOS', color: '#c8181a' },
    visitante: { nombre: 'Covadonga',       abrev: 'COV', color: '#17409a' },
    fecha:     'Domingo 17, 17:30h',
    estadio:   'Marqués Vega de Anzo',
  },
  {
    local:     { nombre: 'Caudal Deportivo', abrev: 'CAU', color: '#c8181a' },
    visitante: { nombre: 'Sporting Atlético',         abrev: 'RSG', color: '#1a6b3a' },
    fecha:     'Domingo 17, 18:30h',
    estadio:   'Hermanos Antuña',
  },
];

// Cliente Supabase (disponible globalmente en app.js)
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
