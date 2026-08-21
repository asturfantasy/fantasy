// ============================================================
// prueba_carga.js — Prueba de rendimiento contra Supabase (solo lectura)
//
// Pensado para correr en GitHub Actions (servidores de GitHub,
// no tu ordenador), eliminando cualquier limitación de tu propia
// conexión doméstica del resultado.
//
// Sigue simulando las pantallas reales: Jugadores, Clasificación,
// y las 2 consultas públicas de Home. NO toca login, NO escribe
// nada, NO consulta resultados de partido.
//
// El número de usuarios y la duración de subida se pueden ajustar
// desde el propio botón "Run workflow" en GitHub, sin tocar este
// archivo — se leen de variables de entorno con valores por
// defecto razonables si no se especifican.
// ============================================================

import http from 'k6/http';
import { sleep, check } from 'k6';

const SUPABASE_URL = 'https://rtmclmqzasktshlzwcyn.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0bWNsbXF6YXNrdHNobHp3Y3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NDUwMjAsImV4cCI6MjA5NDEyMTAyMH0.Z1X05a8EFzCA58iGjXymIBBTs01V5uY7XgIfb8yqiqk';

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
};

// Lee los parámetros de las variables de entorno (puestas por el
// workflow de GitHub Actions desde los inputs del botón "Run
// workflow"), con valores por defecto si se corre en local.
const USUARIOS = parseInt(__ENV.K6_USUARIOS) || 1000;
const DURACION_SUBIDA = __ENV.K6_DURACION_SUBIDA || '300s';

export const options = {
  scenarios: {
    entrada_gradual: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: DURACION_SUBIDA, target: USUARIOS },
        { duration: '60s', target: USUARIOS },
        { duration: '20s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // 1. Jugadores (pantalla Alineación / Mi Equipo)
  let r1 = http.get(
    `${SUPABASE_URL}/rest/v1/jugadores?jornada=eq.1&select=id,nombre,club,posicion,valor,foto_url,escudo_url`,
    { headers }
  );
  check(r1, { 'jugadores: 200': (r) => r.status === 200 });

  sleep(Math.random() * 1.5 + 0.5);

  // 2. Clasificación general
  let r2 = http.get(
    `${SUPABASE_URL}/rest/v1/clasificacion_general_auto?select=*&order=puntos_total.desc&limit=50`,
    { headers }
  );
  check(r2, { 'clasificacion: 200': (r) => r.status === 200 });

  sleep(Math.random() * 1.5 + 0.5);

  // 3. Home — réplica fiel de las 2 consultas públicas de loadHome()
  let r3a = http.get(
    `${SUPABASE_URL}/rest/v1/clasificacion_general_auto?select=*`,
    { headers }
  );
  check(r3a, { 'home clasificacion_general_auto: 200': (r) => r.status === 200 });

  let r3b = http.get(
    `${SUPABASE_URL}/rest/v1/clasificacion_automatica?select=puntos&jornada=eq.1`,
    { headers }
  );
  check(r3b, { 'home clasificacion_automatica: 200': (r) => r.status === 200 });

  sleep(Math.random() * 2 + 1);
}

// Guarda un resumen en JSON al terminar, para poder descargarlo
// desde la pestaña "Actions" de GitHub tras la ejecución.
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    stdout: JSON.stringify(data, null, 2),
  };
}
