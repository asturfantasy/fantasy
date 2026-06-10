const SUPABASE_URL = 'https://rtmclmqzasktshlzwcyn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0bWNsbXF6YXNrdHNobHp3Y3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NDUwMjAsImV4cCI6MjA5NDEyMTAyMH0.Z1X05a8EFzCA58iGjXymIBBTs01V5uY7XgIfb8yqiqk';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables globales que se cargan desde Supabase
let JORNADA_ACTIVA = null;
let JORNADA_VISIBLE = null;
let DEADLINE_JORNADA = null;
let PRESUPUESTO = null;
let PARTIDOS = [];

async function loadConfig() {
  const { data: config } = await db.from('config_jornada').select('*').single();
  PRESUPUESTO = config.presupuesto;
  window.MENSAJE_AVISO = config.mensaje_aviso;
  window.TITULO_JORNADA = config.titulo_jornada;
  window.FECHA_FIN = config.fecha_fin;

  // Calcular jornada activa y visible desde tabla jornadas
  const ahora = new Date();
  const { data: jornadas } = await db.from('jornadas').select('*').order('jornada', { ascending: true });

  if (jornadas?.length) {
    // Jornada visible: última cuyo deadline ya pasó
    const pasadas = jornadas.filter(j => new Date(j.deadline) < ahora);
    const proxima = jornadas.find(j => new Date(j.deadline) >= ahora);

    JORNADA_VISIBLE = pasadas.length ? pasadas[pasadas.length - 1].jornada : 0;
    JORNADA_ACTIVA = proxima ? proxima.jornada : JORNADA_VISIBLE;
    DEADLINE_JORNADA = proxima ? proxima.deadline : null;
  } else {
    // Fallback a config_jornada si no hay jornadas
    JORNADA_ACTIVA = config.jornada_activa;
    JORNADA_VISIBLE = config.jornada_visible;
    DEADLINE_JORNADA = config.deadline;
  }

  const { data: partidos } = await db
    .from('partidos')
    .select('*')
    .eq('jornada', JORNADA_ACTIVA)
    .order('created_at');

  PARTIDOS = (partidos || []).map(p => ({
    local: { nombre: p.local_nombre, abrev: p.local_abrev, escudo_url: p.local_escudo_url },
    visitante: { nombre: p.visitante_nombre, abrev: p.visitante_abrev, escudo_url: p.visitante_escudo_url },
    fecha: p.fecha,
    estadio: p.estadio,
    resultado: { finalizado: p.finalizado, local: p.resultado_local, visitante: p.resultado_visitante }
  }));
}