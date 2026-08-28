// ============================================================
// prueba_carga_sprint_deadline.js — El sprint final antes del cierre
//
// A diferencia de las otras dos pruebas (subida gradual en 5 min,
// o visita única a ritmo constante), esta simula el patrón real
// de un deadline anunciado: la MAYORÍA de la gente entra en los
// últimos minutos, no repartida uniformemente.
//
// Reparto por defecto (500 usuarios en total):
//   - 15% en los primeros 45 min (curiosos, gente organizada)
//   - 85% concentrado en los últimos 15 minutos
//
// Cada "llegada" hace UNA sola pasada (entra, mira, decide, se
// va) — no repite en bucle, como en la vida real.
//
// NO toca login, NO escribe nada (solo lectura, con clave anon).
// ============================================================

import http from 'k6/http';
import { sleep, check } from 'k6';

const SUPABASE_URL = 'https://rtmclmqzasktshlzwcyn.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0bWNsbXF6YXNrdHNobHp3Y3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NDUwMjAsImV4cCI6MjA5NDEyMTAyMH0.Z1X05a8EFzCA58iGjXymIBBTs01V5uY7XgIfb8yqiqk';

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
};
const headersRpc = { ...headers, 'Content-Type': 'application/json' };

// Tasa de llegada en cada tramo (usuarios nuevos por segundo)
const TASA_TRANQUILA = parseFloat(__ENV.K6_TASA_TRANQUILA) || 0.3;  // ~0.3/s durante los primeros 45 min ≈ 75 personas
const TASA_SPRINT = parseFloat(__ENV.K6_TASA_SPRINT) || 5;          // ~5/s en los últimos 15 min ≈ 450 personas

const PROB_DESGLOSE = parseFloat(__ENV.K6_PROB_DESGLOSE) || 0.9;
const PROB_JORNADA = parseFloat(__ENV.K6_PROB_JORNADA) || 0.7;

const JUGADOR_IDS = [
  'd836aa4b-9d33-4d02-a8b1-141e23015ac3',
  '9047670b-21f9-4e19-a8d9-47db5631d355',
  '41f932ab-0fd3-4de0-83b2-f6dae69b9315',
  'b92e2afa-f0f0-4675-bf7c-774303d99310',
  'b821d174-8550-4394-8f1f-07c94bf97b4e',
  'aba041b9-475e-4475-aa3e-3d9b1cf85306',
  '1d5738cd-e978-421f-8de9-b93ee9e6ccab',
  'f67b7542-3211-4375-a759-9820ebb6a6ba',
  'dc9856a5-f672-4ded-80ed-23d3e50153c7',
  '79af3d72-7ab7-487f-a0c5-8527a9b11c63',
];

const MI_USER_IDS = [
  '2bf6141c-03c2-44d5-91d2-b646533cc397',
  '8ef08f2a-c3db-4c7f-bdda-c38563f43ccc',
  '294e7e0f-a768-449e-b66d-e67a41130c6a',
];

function elegirAlAzar(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Reparto: tranquilo (2 min en la prueba, representa ~45 min reales)
// → sprint (1.5 min, representa los ~15 min finales) → cae a 0.
// Para probar más rápido que el tiempo real, comprime proporcionalmente
// las duraciones manteniendo el RATIO tranquilo/sprint (3:1).
export const options = {
  scenarios: {
    sprint_deadline: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 300,
      maxVUs: 900,
      stages: [
        { target: TASA_TRANQUILA, duration: '30s' },  // sube suave al ritmo tranquilo
        { target: TASA_TRANQUILA, duration: '90s' },  // se mantiene tranquilo un rato (~45 min reales, comprimido)
        { target: TASA_SPRINT, duration: '20s' },     // el sprint: todo el mundo entra de golpe
        { target: TASA_SPRINT, duration: '70s' },     // mantiene el pico del sprint (~15 min reales, comprimido)
        { target: 0, duration: '15s' },               // cae tras el deadline
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  let r1 = http.get(
    `${SUPABASE_URL}/rest/v1/jugadores?jornada=eq.1&select=id,nombre,club,posicion,valor,foto_url,escudo_url`,
    { headers }
  );
  check(r1, { 'jugadores: 200': (r) => r.status === 200 });
  sleep(Math.random() * 1.5 + 0.5);

  let r2 = http.get(
    `${SUPABASE_URL}/rest/v1/clasificacion_general_auto?select=*&order=puntos_total.desc&limit=50`,
    { headers }
  );
  check(r2, { 'clasificacion: 200': (r) => r.status === 200 });
  sleep(Math.random() * 1.5 + 0.5);

  let r3a = http.post(
    `${SUPABASE_URL}/rest/v1/rpc/obtener_posicion_general`,
    JSON.stringify({ p_user_id: '00000000-0000-0000-0000-000000000000' }),
    { headers: headersRpc }
  );
  check(r3a, { 'home obtener_posicion_general: 200': (r) => r.status === 200 });

  let r3b = http.post(
    `${SUPABASE_URL}/rest/v1/rpc/obtener_media_puntos`,
    JSON.stringify({ p_jornada: 1 }),
    { headers: headersRpc }
  );
  check(r3b, { 'home obtener_media_puntos: 200': (r) => r.status === 200 });
  sleep(Math.random() * 1 + 0.5);

  if (Math.random() < PROB_DESGLOSE) {
    const jugadorId = elegirAlAzar(JUGADOR_IDS);
    let r4 = http.get(
      `${SUPABASE_URL}/rest/v1/jugadores?id=eq.${jugadorId}&jornada=eq.1&select=minutos,puerta_cero,lne,gol,asistencia,penalti_marcado,penalti_fallado,gol_pp,amarilla,doble_amarilla,roja,total_jornada,puntos_entrenador,goles_encajados`,
      { headers }
    );
    check(r4, { 'desglose jugador: 200': (r) => r.status === 200 });
    sleep(Math.random() * 1 + 0.3);
  }

  if (Math.random() < PROB_JORNADA) {
    const miId = elegirAlAzar(MI_USER_IDS);

    let r5a = http.get(
      `${SUPABASE_URL}/rest/v1/mi_equipo_detalle?user_id=eq.${miId}&jornada=eq.1&select=*&order=posicion`,
      { headers }
    );
    check(r5a, { 'jornada mi_equipo_detalle: 200': (r) => r.status === 200 });

    let r5b = http.get(
      `${SUPABASE_URL}/rest/v1/jugadores?id=in.(${JUGADOR_IDS.slice(0, 5).join(',')})&select=id,escudo_url,foto_url,valor,activo`,
      { headers }
    );
    check(r5b, { 'jornada jugadores extra: 200': (r) => r.status === 200 });

    let r5c = http.get(
      `${SUPABASE_URL}/rest/v1/mi_equipo?user_id=eq.${miId}&jornada=eq.1&capitan=eq.true&select=jugador_id`,
      { headers }
    );
    check(r5c, { 'jornada capitan: 200': (r) => r.status === 200 });

    sleep(Math.random() * 1 + 0.3);
  }
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    stdout: JSON.stringify(data, null, 2),
  };
}