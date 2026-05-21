const SUPABASE_URL = 'https://rtmclmqzasktshlzwcyn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8aNRtGX0cHoNcaJHv9ASOw_Fz-3Of-2';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales que se cargan desde Supabase
let JORNADA_ACTIVA = null;
let JORNADA_VISIBLE = null;
let DEADLINE_JORNADA = null;
let PRESUPUESTO = null;
let PARTIDOS = [];

async function loadConfig() {
  const { data: config } = await db.from('config_jornada').select('*').single();

  JORNADA_ACTIVA   = config.jornada_activa;
  JORNADA_VISIBLE  = config.jornada_visible;
  DEADLINE_JORNADA = config.deadline;
  PRESUPUESTO      = config.presupuesto;
  window.MENSAJE_AVISO = config.mensaje_aviso;
  window.TITULO_JORNADA = config.titulo_jornada;
  window.FECHA_FIN = config.fecha_fin;

  const { data: partidos } = await db
    .from('partidos')
    .select('*')
    .eq('jornada', JORNADA_ACTIVA)
    .order('created_at');

  PARTIDOS = (partidos || []).map(p => ({
    local: {
      nombre:     p.local_nombre,
      abrev:      p.local_abrev,
      escudo_url: p.local_escudo_url
    },
    visitante: {
      nombre:     p.visitante_nombre,
      abrev:      p.visitante_abrev,
      escudo_url: p.visitante_escudo_url
    },
    fecha:    p.fecha,
    estadio:  p.estadio,
    resultado: {
      finalizado: p.finalizado,
      local:      p.resultado_local,
      visitante:  p.resultado_visitante
    }
  }));
}