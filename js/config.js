const SUPABASE_URL = 'https://rtmclmqzasktshlzwcyn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8aNRtGX0cHoNcaJHv9ASOw_Fz-3Of-2';

const JORNADA_ACTIVA = 1;

// Actualiza los partidos cada jornada.
// escudo_url: URL del escudo del equipo (opcional, si no hay se muestra la abreviatura)
const PARTIDOS = [
  {
    local:     { nombre: 'Mosconia',       abrev: 'MOS', color: '#83BFC7', escudo_url: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/sign/escudos/MosconiaEscudo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xMzdiOGIxYS1lMzkzLTRjNjMtOTNlNS0yNThmOGZlZWVjZDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlc2N1ZG9zL01vc2NvbmlhRXNjdWRvLnBuZyIsImlhdCI6MTc3ODYwNDkwNCwiZXhwIjoyMjUxNjQ0OTA0fQ.5OFUtjz62YVtkT0NDEUmBD4I4LVTENItKTksoRsLmkg' },
    visitante: { nombre: 'Covadonga',       abrev: 'COV', color: '#310FBD', escudo_url: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/sign/escudos/CovadongaEscudo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xMzdiOGIxYS1lMzkzLTRjNjMtOTNlNS0yNThmOGZlZWVjZDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlc2N1ZG9zL0NvdmFkb25nYUVzY3Vkby5wbmciLCJpYXQiOjE3Nzg2MDQ5MTgsImV4cCI6MjI1MTY0NDkxOH0.nFE1GekbM4per2WpZHZD6wYIf6BQnT9-j2eyS7vjFX4' },
    fecha:     'Domingo 17, 18:00h',
    estadio:   'Marqués Vega de Anzo',
  },
  {
    local:     { nombre: 'Caudal Deportivo', abrev: 'CAU', color: '#000000', escudo_url: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/sign/escudos/CaudalDeportivoEscudo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xMzdiOGIxYS1lMzkzLTRjNjMtOTNlNS0yNThmOGZlZWVjZDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlc2N1ZG9zL0NhdWRhbERlcG9ydGl2b0VzY3Vkby5wbmciLCJpYXQiOjE3Nzg2MDQ5MzMsImV4cCI6MjI1MTY0NDkzM30.n8r1_-ian0F2rPWR8VH5Q_U6x2ckbEnTlERH8O8TkTo' },
    visitante: { nombre: 'Sporting Atlético',         abrev: 'SPO', color: '#DE0000', escudo_url: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/sign/escudos/SportingEscudo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xMzdiOGIxYS1lMzkzLTRjNjMtOTNlNS0yNThmOGZlZWVjZDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlc2N1ZG9zL1Nwb3J0aW5nRXNjdWRvLnBuZyIsImlhdCI6MTc3ODYwNDg4NiwiZXhwIjoyMjUxNjQ0ODg2fQ.EksntY9-B5av3LSKcLhUDUZVjGLBjEw1OT05Ko8ZlAU' },
    fecha:     'Domingo 17, 18:30h',
    estadio:   'Hermanos Antuña',
  }
];

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
