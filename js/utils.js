/* ============================================================
   js/utils.js  —  Variables globales y utilidades compartidas
   ============================================================ */

/* ── VARIABLES GLOBALES ─────────────────────────────────── */
let currentUser = null;
let cambiosSinGuardar = false;
let paginaActual = 1;
const POR_PAGINA = 25;
let renderJugadoresFn = null;
let notificacionesActivas = false;
let equipoFavoritoSeleccionado = null;
let toastTimeout = null;

const CLUBES_INFO = {
  COV: { nombre: 'CD Covadonga',         escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/COV.png' },
  MOS: { nombre: 'CD Mosconia',          escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/MOS.png' },
  EIS: { nombre: 'Sporting Atlético', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/SPO.png' },
  EIS: { nombre: 'EI San Martín', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/EIS.png' },
  LEA: { nombre: 'CD Lealtad', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/LEA.png' },
  UPL: { nombre: 'UP Langreo', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/UPL.png' },
  LEN: { nombre: 'LEntregu CF', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/LEN.png' },
  UCC: { nombre: 'UC Ceares', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/UCC.png' },
  PRA: { nombre: 'CD Praviano', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/PRA.png' },
  SIE: { nombre: 'Club Siero', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/SIE.png' },
  COL: { nombre: 'CD Colunga', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/COL.png' },
  LLA: { nombre: 'CD Llanes', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/LLA.png' },
  STA: { nombre: 'Avilés Stadium CF', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/STA.png' },
  IND: { nombre: 'UD Gijón Industrial', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/IND.png' },
  CAU: { nombre: 'Caudal Deportivo', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/CAU.png' },
  AST: { nombre: 'Astur CF', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/AST.png' },
  AND: { nombre: 'Andés CF', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/AND.png' },
  CON: { nombre: 'Condal CF', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/CON.png' },
};

// Variables de alineación compartidas
let seleccionados = {};
let jugadoresPorPos = { POR:[], DEF:[], MED:[], DEL:[], ENT:[] };
let capitan = null;

const FORMACIONES = {
  '4-3-3': { def:4, mid:3, fwd:3 }, '4-4-2': { def:4, mid:4, fwd:2 },
  '4-5-1': { def:4, mid:5, fwd:1 }, '3-4-3': { def:3, mid:4, fwd:3 },
  '3-5-2': { def:3, mid:5, fwd:2 }, '5-3-2': { def:5, mid:3, fwd:2 },
};

const POS_COLORS = { POR:'var(--pos-gk)', DEF:'var(--pos-def)', MED:'var(--pos-mid)', DEL:'var(--pos-fwd)', ENT:'var(--pos-ent)' };
const POS_TEXT   = { POR:'#0d1117', DEF:'white', MED:'#0d1117', DEL:'white', ENT:'white' };

window.addEventListener('beforeunload', e => {
  if (cambiosSinGuardar) { e.preventDefault(); e.returnValue = ''; }
});

/* ── UTILIDADES ─────────────────────────────────────────── */
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#b03020' : '#21262d';
  t.classList.remove('show');
  void t.offsetHeight;
  t.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    document.getElementById('toast').classList.remove('show');
  }, 2000);
}

function jornadadCerrada() { return new Date() > new Date(DEADLINE_JORNADA); }

function medalClass(pos) { return pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : ''; }

function updateBottomNav(screenId) {
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.target === screenId);
  });
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = 'flex';
}

function cambiarPagina(dir) {
  paginaActual += dir;
  if (renderJugadoresFn) renderJugadoresFn();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function actualizarPresupuesto() {
  const gastado = Object.values(seleccionados).reduce((acc, j) => acc + (j.valor || 0), 0);
  const disponible = PRESUPUESTO - gastado;
  const el = document.getElementById('presupuesto-valor');
  if (el) { el.textContent = disponible.toFixed(1) + 'M'; el.style.color = disponible < 0 ? 'var(--red)' : disponible < 10 ? 'var(--amber)' : 'var(--neon)'; }
}

function updateNavUser(user) {
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // Actualizar todos los avatares de la página
  document.querySelectorAll('[id^="nav-avatar"]').forEach(av => {
    av.textContent = initials;
    av.title = name;
  });
  document.querySelectorAll('[id^="user-menu-name"]').forEach(el => {
    el.textContent = '¡Hola, ' + name.split(' ')[0] + '!';
  });
  document.querySelectorAll('[id^="user-menu-email"]').forEach(el => {
    el.textContent = user?.email || '';
  });
}

/* ── NAVEGACIÓN ─────────────────────────────────────────── */
function toggleUserMenu() {
  const menus = ['user-menu', 'user-menu-lineup', 'user-menu-myteam', 'user-menu-ranking', 'user-menu-criterios'];
  const screenActiva = document.querySelector('.screen.active');
  const menuId = screenActiva?.id === 'screen-home' ? 'user-menu'
    : screenActiva?.id === 'screen-lineup' ? 'user-menu-lineup'
    : screenActiva?.id === 'screen-myteam' ? 'user-menu-myteam'
    : screenActiva?.id === 'screen-ranking' ? 'user-menu-ranking'
    : screenActiva?.id === 'screen-criterios' ? 'user-menu-criterios' : 'user-menu';
  menus.forEach(id => { const m = document.getElementById(id); if (m) m.style.display = 'none'; });
  const menu = document.getElementById(menuId);
  if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  if (currentUser) actualizarToggleNotif(notificacionesActivas);
}

document.addEventListener('click', e => {
  if (!e.target.closest('.nav-user')) ['user-menu', 'user-menu-lineup', 'user-menu-myteam', 'user-menu-ranking', 'user-menu-criterios'].forEach(id => { const m = document.getElementById(id); if (m) m.style.display = 'none'; });
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  ['user-menu', 'user-menu-lineup', 'user-menu-myteam', 'user-menu-ranking', 'user-menu-criterios'].forEach(id => { const m = document.getElementById(id); if (m) m.style.display = 'none'; });
});

document.addEventListener('click', e => { const btn = e.target.closest('[data-target]'); if (btn) goTo(btn.dataset.target); });

function goTo(screenId) {
  const t = document.getElementById('toast');
  if (t) t.classList.remove('show');
  if (toastTimeout) { clearTimeout(toastTimeout); toastTimeout = null; }

  const screenActiva = document.querySelector('.screen.active');
  if (cambiosSinGuardar && screenActiva?.id === 'screen-lineup' && screenId !== 'lineup') {
    if (!confirm('⚠️ No has guardado los cambios. ¿Seguro que quieres salir?')) return;
    cambiosSinGuardar = false;
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + screenId);
  if (el) el.classList.add('active');
  const titulos = {
    home: 'Inicio', lineup: 'Alineación', myteam: 'Mi Equipo',
    ranking: 'Clasificación', criterios: 'Puntuación',
    'ranking-clasificacion': 'Clasificación',
    'ranking-ligas': 'Ligas privadas',
    'ranking-jugadores': 'Jugadores',
    'ranking-once': 'Once ideal',
    'ranking-rentable': 'Once rentable',
    'ranking-mvp': 'MVP de la jornada',
    'ranking-comparador': 'Comparador',
    'ranking-detalle': 'Al detalle',
    'perfil': 'Mi perfil',
  };
  document.title = 'AsturFantasy · ' + (titulos[screenId] || 'AsturFantasy');
  window.scrollTo(0, 0);
  updateBottomNav(screenId);
  const loaders = {
    home: loadHome, lineup: loadLineup, myteam: loadMyTeam,
    ranking: loadRanking, criterios: () => {},
    'ranking-clasificacion': loadRankingClasificacion,
    'ranking-ligas': loadLigas,
    'ranking-jugadores': loadRankingJugadores,
    'ranking-once': loadRankingOnce,
    'ranking-rentable': loadRankingRentable,
    'ranking-mvp': loadMVP,
    'ranking-comparador': loadComparador,
    'ranking-detalle': loadRankingDetalle,
    'perfil': loadPerfil,
  };
  if (loaders[screenId]) loaders[screenId]();
  const screensPersistentes = ['home', 'lineup', 'myteam', 'ranking', 'criterios', 'perfil'];
  if (screensPersistentes.includes(screenId)) localStorage.setItem('lastScreen', screenId);
}
