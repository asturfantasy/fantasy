const SUPABASE_URL = 'https://rtmclmqzasktshlzwcyn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8aNRtGX0cHoNcaJHv9ASOw_Fz-3Of-2';

const JORNADA_ACTIVA = 1;

const PARTIDOS = [
  {
    local:     { nombre: 'Mosconia',       abrev: 'MOS', color: '#FFFFFF' },
    visitante: { nombre: 'Covadonga',       abrev: 'COV', color: '#1C0096' },
    fecha:     'Domingo 17, 18:00h',
    estadio:   'Marqués Vega de Anzo',
  },
  {
    local:     { nombre: 'Caudal Deportivo', abrev: 'CAU', color: '#000000' },
    visitante: { nombre: 'Sporting Atlético',         abrev: 'RSG', color: '#FF0303' },
    fecha:     'Domingo 17, 18:30h',
    estadio:   'Hermanos Antula',
  },
];

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
