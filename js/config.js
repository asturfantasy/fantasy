const SUPABASE_URL = 'https://rtmclmqzasktshlzwcyn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8aNRtGX0cHoNcaJHv9ASOw_Fz-3Of-2';

const JORNADA_ACTIVA = 28;

const PARTIDOS = [
  {
    local:     { nombre: 'Real Madrid',       abrev: 'RMA', color: '#c8181a' },
    visitante: { nombre: 'FC Barcelona',       abrev: 'BAR', color: '#17409a' },
    fecha:     'Sáb 18:00',
    estadio:   'Bernabéu',
  },
  {
    local:     { nombre: 'Atlético de Madrid', abrev: 'ATL', color: '#c8181a' },
    visitante: { nombre: 'Sevilla FC',         abrev: 'SEV', color: '#1a6b3a' },
    fecha:     'Dom 16:15',
    estadio:   'Cívitas',
  },
  {
    local:     { nombre: 'Athletic Club',      abrev: 'ATH', color: '#c60b1e' },
    visitante: { nombre: 'Valencia CF',        abrev: 'VLC', color: '#1a1a16' },
    fecha:     'Dom 21:00',
    estadio:   'San Mamés',
  },
];

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
