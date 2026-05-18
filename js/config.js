const SUPABASE_URL = 'https://rtmclmqzasktshlzwcyn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8aNRtGX0cHoNcaJHv9ASOw_Fz-3Of-2';

const JORNADA_ACTIVA = 36;
const JORNADA_VISIBLE = 35;
const DEADLINE_JORNADA = '2026-05-24T12:00:00';
const PRESUPUESTO = 125;


// Actualiza los partidos cada jornada.
// escudo_url: URL del escudo del equipo (opcional, si no hay se muestra la abreviatura)
const PARTIDOS = [
  {
    local: { nombre: 'COVADONGA', abrev: 'COV',  escudo_url: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/sign/escudos/OtroCovadongaEscudo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xMzdiOGIxYS1lMzkzLTRjNjMtOTNlNS0yNThmOGZlZWVjZDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlc2N1ZG9zL090cm9Db3ZhZG9uZ2FFc2N1ZG8ucG5nIiwiaWF0IjoxNzc4NzU5NTg5LCJleHAiOjIyNTE3OTk1ODl9.JeT0p-_VGffI85ecrgCUZKVcCRrK7kYxo1eFTn__x5s' },
    visitante:     { nombre: 'MOSCONIA',  abrev: 'MOS', escudo_url: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/sign/escudos/MosconiaEscudo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xMzdiOGIxYS1lMzkzLTRjNjMtOTNlNS0yNThmOGZlZWVjZDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlc2N1ZG9zL01vc2NvbmlhRXNjdWRvLnBuZyIsImlhdCI6MTc3ODYwNDkwNCwiZXhwIjoyMjUxNjQ0OTA0fQ.5OFUtjz62YVtkT0NDEUmBD4I4LVTENItKTksoRsLmkg' },
    fecha:     'Domingo 24, 12:00h',
    estadio:   'Álvarez Rabanal',
    resultado: { finalizado: null },
  },
  {
    local: { nombre: 'SPORTING ATLÉTICO', abrev: 'SPO', escudo_url: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/sign/escudos/SportingEscudo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xMzdiOGIxYS1lMzkzLTRjNjMtOTNlNS0yNThmOGZlZWVjZDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlc2N1ZG9zL1Nwb3J0aW5nRXNjdWRvLnBuZyIsImlhdCI6MTc3ODYwNDg4NiwiZXhwIjoyMjUxNjQ0ODg2fQ.EksntY9-B5av3LSKcLhUDUZVjGLBjEw1OT05Ko8ZlAU' },
    visitante:     { nombre: 'CAUDAL DEPORTIVO', abrev: 'CAU', escudo_url: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/sign/escudos/CaudalDeportivoEscudo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xMzdiOGIxYS1lMzkzLTRjNjMtOTNlNS0yNThmOGZlZWVjZDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlc2N1ZG9zL0NhdWRhbERlcG9ydGl2b0VzY3Vkby5wbmciLCJpYXQiOjE3Nzg2MDQ5MzMsImV4cCI6MjI1MTY0NDkzM30.n8r1_-ian0F2rPWR8VH5Q_U6x2ckbEnTlERH8O8TkTo' },
    fecha:     'Domingo 24, 12:00h',
    estadio:   'Mareo',
    resultado: { finalizado: null },
  }
];

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
