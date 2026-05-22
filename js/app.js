/* ============================================================
   js/app.js  —  Lógica completa de AsturFantasy
   ============================================================ */

/* ── 1. VARIABLES GLOBALES ───────────────────────────────── */
let currentUser = null;
let cambiosSinGuardar = false;
let paginaActual = 1;
const POR_PAGINA = 25;
let renderJugadoresFn = null;
let notificacionesActivas = false;
let equipoFavoritoSeleccionado = null;

const CLUBES_INFO = {
  CAU: { nombre: 'Caudal Deportivo',  escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/caudal_deportivo.png' },
  COV: { nombre: 'Covadonga',         escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/covadonga.png' },
  MOS: { nombre: 'Mosconia',          escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/mosconia.png' },
  SPO: { nombre: 'Sporting Atlético', escudo: 'https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/sporting_atletico.png' },
};

window.addEventListener('beforeunload', e => {
  if (cambiosSinGuardar) { e.preventDefault(); e.returnValue = ''; }
});

/* ── 2. UTILIDADES ───────────────────────────────────────── */
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#b03020' : '#21262d';
  t.style.bottom = 'calc(env(keyboard-inset-height, 0px) + 80px)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

function jornadadCerrada() { return new Date() > new Date(DEADLINE_JORNADA); }

function updateBottomNav(screenId) {
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.target === screenId);
  });
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = 'flex';
}

/* ── 3. NOTIFICACIONES ───────────────────────────────────── */
async function toggleNotificaciones() {
  const { data: existente } = await db.from('push_subscriptions').select('id').eq('user_id', currentUser.id).limit(1);
  if (existente?.length) {
    await db.from('push_subscriptions').delete().eq('user_id', currentUser.id);
    actualizarToggleNotif(false);
    showToast('Notificaciones desactivadas');
  } else {
    await registrarNotificaciones();
    actualizarToggleNotif(true);
    showToast('Notificaciones activadas');
  }
}

function actualizarToggleNotif(activo) {
  notificacionesActivas = activo;
  document.querySelectorAll('[id^="toggle-notif"]').forEach(toggle => {
    toggle.style.background = activo ? '#00d97e' : '#888';
    const knob = toggle.querySelector('div');
    if (knob) knob.style.left = activo ? '18px' : '2px';
  });
}

async function registrarNotificaciones() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return;
  const { data: existente } = await db.from('push_subscriptions').select('id').eq('user_id', currentUser.id).single();
  if (existente) return;
  const registro = await navigator.serviceWorker.ready;
  const subscription = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: 'BKuhEIkRfRwx5RT6uZeVF_ZRhHQ_mVOVqgGfrBMhZ1KLwCaOvqoaabX3OeRt_k7Edi1nFguD9x5pS0_nI99bPQ0'
  });
  await db.from('push_subscriptions').insert({ user_id: currentUser.id, subscription: JSON.stringify(subscription) });
  actualizarToggleNotif(true);
}

/* ── 4. EQUIPO FAVORITO ──────────────────────────────────── */
function seleccionarEquipoFavorito(club) {
  equipoFavoritoSeleccionado = club;
  document.querySelectorAll('.equipo-favorito-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.club === club);
  });
  const btn = document.getElementById('btn-guardar-equipo-favorito');
  if (btn) { btn.disabled = false; btn.style.background = 'var(--neon)'; btn.style.color = '#0d1117'; btn.style.cursor = 'pointer'; }
}

document.getElementById('btn-guardar-equipo-favorito')?.addEventListener('click', async () => {
  if (!equipoFavoritoSeleccionado || !currentUser) return;
  const btn = document.getElementById('btn-guardar-equipo-favorito');
  btn.disabled = true; btn.textContent = 'Guardando...';
  await db.from('equipos').update({ equipo_favorito: equipoFavoritoSeleccionado }).eq('user_id', currentUser.id);
  document.getElementById('modal-equipo-favorito').classList.remove('open');
  goTo('home');
});

/* ── 5. CONSULTA PUNTOS ──────────────────────────────────── */
async function abrirConsultaPuntos() {
  const modal = document.getElementById('modal-puntos-jornada');
  const content = document.getElementById('puntos-jornada-content');
  document.getElementById('puntos-jornada-titulo').textContent = 'Consulta de puntos';
  content.innerHTML = '';
  modal.classList.add('open');

  const selectEquipo = document.getElementById('puntos-equipo-select');
  if (selectEquipo) selectEquipo.style.display = 'none';

  const { data: jornadasData } = await db.from('partidos')
    .select('jornada')
    .lt('jornada', JORNADA_ACTIVA)
    .order('jornada', { ascending: false });
  const jornadas = [...new Set((jornadasData || []).map(p => p.jornada))];

  if (!jornadas.length) {
    content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">No hay jornadas anteriores disponibles</div>';
    return;
  }

  let jornadaSelect = document.getElementById('puntos-jornada-select');
  if (!jornadaSelect) {
    jornadaSelect = document.createElement('select');
    jornadaSelect.id = 'puntos-jornada-select';
    jornadaSelect.className = 'formation-select';
    jornadaSelect.style.cssText = 'width:100%;margin-bottom:14px';
    content.parentNode.insertBefore(jornadaSelect, content);
  }
  jornadaSelect.style.display = 'block';
  jornadaSelect.innerHTML = jornadas.map(j => '<option value="' + j + '">Jornada ' + j + '</option>').join('');
  jornadaSelect.value = jornadas[0];

  const cargarPartidos = async () => {
    const jornada = parseInt(jornadaSelect.value);
    content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Cargando...</div>';
    const { data: partidos } = await db.from('partidos').select('*').eq('jornada', jornada).order('fecha');
    if (!partidos?.length) { content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin partidos para esta jornada</div>'; return; }
    content.innerHTML = partidos.map(p => `
      <div class="match-card" style="cursor:pointer;margin-bottom:8px" onclick="mostrarPartido('${p.local_abrev}','${p.visitante_abrev}','${p.local_nombre}','${p.visitante_nombre}',${jornada})">
        <div class="match-team">
          <div class="crest" style="display:flex;align-items:center;justify-content:center">
            ${p.local_escudo_url ? '<img loading="lazy" src="' + p.local_escudo_url + '" width="44" height="44" style="object-fit:contain">' : p.local_abrev}
          </div>
          <div><div class="team-name">${p.local_nombre}</div></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;padding:0 8px;min-width:90px">
          ${p.finalizado
            ? '<div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--text);letter-spacing:2px">' + p.resultado_local + ' - ' + p.resultado_visitante + '</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--neon);text-transform:uppercase">Final</div>'
            : '<div class="match-vs">' + (p.estadio || '') + '</div><div class="match-date">' + (p.fecha || '') + '</div>'}
        </div>
        <div class="match-team right">
          <div class="crest" style="display:flex;align-items:center;justify-content:center">
            ${p.visitante_escudo_url ? '<img loading="lazy" src="' + p.visitante_escudo_url + '" width="44" height="44" style="object-fit:contain">' : p.visitante_abrev}
          </div>
          <div style="text-align:right"><div class="team-name">${p.visitante_nombre}</div></div>
        </div>
      </div>`).join('');
  };

  await cargarPartidos();
  jornadaSelect.onchange = cargarPartidos;
}

document.getElementById('puntos-jornada-close')?.addEventListener('click', () => {
  document.getElementById('modal-puntos-jornada').classList.remove('open');
  const jornadaSelect = document.getElementById('puntos-jornada-select');
  if (jornadaSelect) jornadaSelect.style.display = 'none';
  const selectEquipo = document.getElementById('puntos-equipo-select');
  if (selectEquipo) selectEquipo.style.display = 'block';
});
document.getElementById('modal-puntos-jornada')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

/* ── 6. PRESUPUESTO ──────────────────────────────────────── */
function actualizarPresupuesto() {
  const gastado = Object.values(seleccionados).reduce((acc, j) => acc + (j.valor || 0), 0);
  const disponible = PRESUPUESTO - gastado;
  const el = document.getElementById('presupuesto-valor');
  if (el) { el.textContent = disponible.toFixed(1) + 'M'; el.style.color = disponible < 0 ? 'var(--red)' : disponible < 10 ? 'var(--amber)' : 'var(--neon)'; }
}

/* ── 7. HISTORIAL ────────────────────────────────────────── */
async function mostrarHistorial(nombre, club, posicion) {
  const modal = document.getElementById('modal-historial');
  const content = document.getElementById('historial-content');
  document.getElementById('historial-titulo').textContent = nombre;
  content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Cargando...</div>';
  modal.classList.add('open');
  const { data, error } = await db.from('jugadores').select('jornada, total_jornada, escudo_url, foto_url, rival, es_local').eq('nombre', nombre).eq('club', club).order('jornada', { ascending: true });
  if (error || !data?.length) { content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin datos</div>'; return; }
  const maxPts = Math.max(...data.map(d => d.total_jornada), 1);
  const total = data.reduce((acc, d) => acc + d.total_jornada, 0);
  const foto = data[0]?.foto_url || '';
  const escudo = data[0]?.escudo_url || '';
  content.innerHTML = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)"><div style="width:56px;height:56px;border-radius:50%;background:var(--surface);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:20px;color:var(--text-muted);flex-shrink:0;position:relative">' + (foto ? '<img loading="lazy" src="' + foto + '" width="56" height="56" style="object-fit:cover;border-radius:50%">' : nombre.substring(0,2).toUpperCase()) + (escudo ? '<img loading="lazy" src="' + escudo + '" width="18" height="18" style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;border-radius:50%;background:var(--bg2);border:1px solid var(--border)">' : '') + '</div><div><div style="font-family:var(--font-display);font-weight:700;font-size:18px;color:var(--text)">' + nombre + '</div><div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">' + posicion + '</div></div></div><div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);text-align:right;margin-bottom:14px;letter-spacing:1px">TOTAL: <strong style="color:var(--neon)">' + total + ' pts</strong></div>' +
    data.map(d => '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><div style="display:flex;align-items:center;gap:4px;flex-shrink:0;min-width:80px"><span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">J' + d.jornada + '</span>' + (d.rival ? '<span style="font-size:10px">' + (d.es_local ? '🏠' : '✈️') + '</span><span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">' + d.rival + '</span>' : '') + '</div><div style="flex:1;background:var(--surface);border-radius:4px;height:22px;overflow:hidden"><div style="height:100%;width:' + Math.max((d.total_jornada / maxPts) * 100, 0) + '%;background:var(--neon);border-radius:4px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;min-width:' + (d.total_jornada > 0 ? '24px' : '0') + '">' + (d.total_jornada > 0 ? '<span style="font-family:var(--font-display);font-size:11px;color:#0d1117;font-weight:700">' + d.total_jornada + '</span>' : '') + '</div></div>' + (d.total_jornada <= 0 ? '<span style="font-family:var(--font-display);font-size:12px;color:var(--text-muted)">0</span>' : '') + '</div>').join('');
}

/* ── 8. PARTIDO ──────────────────────────────────────────── */
async function mostrarPartido(localAbrev, visitanteAbrev, localNombre, visitanteNombre, jornada) {
  if (!jornada) jornada = JORNADA_ACTIVA;
  const modal = document.getElementById('modal-partido');
  const content = document.getElementById('partido-content');
  const titulo = document.getElementById('partido-titulo');
  const { data: partidoDB } = await db.from('partidos')
    .select('resultado_local, resultado_visitante, finalizado')
    .eq('local_abrev', localAbrev).eq('jornada', jornada).single();
  const marcador = partidoDB?.finalizado ? ' ' + partidoDB.resultado_local + ' - ' + partidoDB.resultado_visitante : '';
  titulo.textContent = localNombre + marcador + ' ' + visitanteNombre;
  content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Cargando...</div>';
  modal.classList.add('open');
  const { data, error } = await db.from('jugadores')
    .select('nombre, club, posicion, total_jornada, escudo_url, foto_url, minutos, puerta_cero, lne, gol, asistencia, penalti, gol_pp, amarilla, doble_amarilla, roja, puntos_entrenador')
    .in('club', [localAbrev, visitanteAbrev]).eq('jornada', jornada).order('total_jornada', { ascending: false });
  if (error || !data?.length) { content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin datos</div>'; return; }
  const ordenPos = ['POR','DEF','MED','DEL','ENT'];
  const local = data.filter(j => j.club === localAbrev).sort((a,b) => ordenPos.indexOf(a.posicion) - ordenPos.indexOf(b.posicion));
  const visitante = data.filter(j => j.club === visitanteAbrev).sort((a,b) => ordenPos.indexOf(a.posicion) - ordenPos.indexOf(b.posicion));
  const rj = (j, al) => '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer;flex-direction:' + (al === 'right' ? 'row-reverse' : 'row') + '" onclick="mostrarDesglose(' + JSON.stringify(j).replace(/"/g, '&quot;') + ')"><div style="position:relative;width:30px;height:30px;flex-shrink:0">' + (j.foto_url ? '<img loading="lazy" src="' + j.foto_url + '" width="30" height="30" style="object-fit:cover;border-radius:50%;border:1px solid var(--border)" onerror="this.style.display=\'none\'">' : '<div style="width:30px;height:30px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:10px;color:var(--text-muted)">' + j.nombre.substring(0,2).toUpperCase() + '</div>') + (j.escudo_url ? '<img loading="lazy" src="' + j.escudo_url + '" width="11" height="11" style="position:absolute;bottom:-1px;right:-1px;object-fit:contain;border-radius:50%;background:white;border:1px solid rgba(0,0,0,0.2)">' : '') + '</div><div style="flex:1;min-width:0;text-align:' + (al === 'right' ? 'right' : 'left') + '"><div style="font-family:var(--font-display);font-weight:600;font-size:12px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + j.nombre + '</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">' + j.posicion + '</div></div><div style="font-family:var(--font-display);font-weight:700;font-size:15px;color:var(--neon);flex-shrink:0">' + j.total_jornada + '</div></div>';
  const tl = local.reduce((acc, j) => acc + (j.total_jornada || 0), 0);
  const tv = visitante.reduce((acc, j) => acc + (j.total_jornada || 0), 0);
  content.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:60vh;overflow-y:auto;padding-right:4px"><div><div style="font-family:var(--font-display);font-weight:700;font-size:13px;color:var(--text);text-align:center;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid var(--neon);position:sticky;top:0;background:var(--bg2);z-index:1">' + localNombre + ' <span style="color:var(--neon)">(' + tl + ')</span></div>' + local.map(j => rj(j,'left')).join('') + '</div><div><div style="font-family:var(--font-display);font-weight:700;font-size:13px;color:var(--text);text-align:center;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid var(--neon);position:sticky;top:0;background:var(--bg2);z-index:1">' + visitanteNombre + ' <span style="color:var(--neon)">(' + tv + ')</span></div>' + visitante.map(j => rj(j,'right')).join('') + '</div></div>';
}

document.getElementById('partido-close')?.addEventListener('click', () => document.getElementById('modal-partido').classList.remove('open'));
document.getElementById('modal-partido')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

document.getElementById('btn-guardar-nombre-inicio')?.addEventListener('click', async () => {
  const nombre = document.getElementById('input-nombre-equipo-inicio').value.trim();
  if (!nombre) { showToast('Introduce un nombre', true); return; }
  await db.from('equipos').upsert({ user_id: currentUser.id, nombre_equipo: nombre }, { onConflict: 'user_id' });
  document.getElementById('modal-nombre-equipo').classList.remove('open');
  document.getElementById('modal-equipo-favorito').classList.add('open');
});

/* ── 9. DESGLOSE ─────────────────────────────────────────── */
function desgloseFn(j) {
  const items = [];
  if (j.posicion === 'ENT') { items.push({ label: 'Puntos entrenador', pts: j.puntos_entrenador || 0 }); return items; }
  const pcPts = j.posicion === 'POR' || j.posicion === 'DEF' ? 4 : j.posicion === 'MED' ? 2 : 0;
  const golPts = j.posicion === 'POR' ? 6 : j.posicion === 'DEF' ? 5 : j.posicion === 'MED' ? 4 : 3;
  const lnePts = j.lne === 1 ? 2 : j.lne === 2 ? 6 : j.lne === 3 ? 10 : 0;
  items.push({ label: 'Minutos (' + (j.minutos || 0) + ')', pts: (j.minutos || 0) >= 60 ? 2 : (j.minutos || 0) > 0 ? 1 : 0 });
  if (pcPts > 0) items.push({ label: 'Portería a cero', pts: (j.puerta_cero && (j.minutos || 0) >= 60) ? pcPts : 0 });
  items.push({ label: 'Nota LNE (' + (j.lne || 0) + ')', pts: lnePts });
  items.push({ label: 'Goles (' + (j.gol || 0) + ')', pts: (j.gol || 0) * golPts });
  items.push({ label: 'Asistencias (' + (j.asistencia || 0) + ')', pts: (j.asistencia || 0) * 3 });
  items.push({ label: 'Penaltis (' + (j.penalti || 0) + ')', pts: (j.penalti || 0) * 3 });
  items.push({ label: 'Gol PP (' + (j.gol_pp || 0) + ')', pts: (j.gol_pp || 0) * -2 });
  items.push({ label: 'Amarillas (' + (j.amarilla || 0) + ')', pts: (j.amarilla || 0) * -1 });
  items.push({ label: 'Doble amarilla (' + (j.doble_amarilla || 0) + ')', pts: (j.doble_amarilla || 0) * -3 });
  items.push({ label: 'Roja directa (' + (j.roja || 0) + ')', pts: (j.roja || 0) * -5 });
  if (j.posicion === 'POR' || j.posicion === 'DEF') items.push({ label: 'Goles encajados (' + (j.goles_encajados || 0) + ')', pts: -Math.floor((j.goles_encajados || 0) / 2) });
  return items;
}

function mostrarDesglose(j) {
  const modal = document.getElementById('modal-desglose');
  const content = document.getElementById('desglose-content');
  document.getElementById('desglose-titulo').textContent = j.nombre;
  const items = desgloseFn(j);
  content.innerHTML = items.length
    ? items.map(item => '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-family:var(--font-body);font-size:13px;color:var(--text-muted)">' + item.label + '</span><span style="font-family:var(--font-display);font-weight:700;font-size:15px;color:' + (item.pts >= 0 ? 'var(--neon)' : 'var(--red)') + '">' + (item.pts > 0 ? '+' : '') + item.pts + '</span></div>').join('') + '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;margin-top:4px"><span style="font-family:var(--font-display);font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:var(--text)">Total</span><span style="font-family:var(--font-display);font-weight:700;font-size:24px;color:var(--neon)">' + j.total_jornada + '</span></div>'
    : '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin puntuación esta jornada</div>';
  modal.classList.add('open');
}

document.getElementById('desglose-close')?.addEventListener('click', () => document.getElementById('modal-desglose').classList.remove('open'));
document.getElementById('modal-desglose')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

/* ── 10. NAVEGACIÓN ──────────────────────────────────────── */
function cambiarPagina(dir) { paginaActual += dir; if (renderJugadoresFn) renderJugadoresFn(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function toggleUserMenu() {
  const menus = ['user-menu', 'user-menu-lineup', 'user-menu-myteam', 'user-menu-ranking', 'user-menu-criterios'];
  const screenActiva = document.querySelector('.screen.active');
  const menuId = screenActiva?.id === 'screen-home' ? 'user-menu' : screenActiva?.id === 'screen-lineup' ? 'user-menu-lineup' : screenActiva?.id === 'screen-myteam' ? 'user-menu-myteam' : screenActiva?.id === 'screen-ranking' ? 'user-menu-ranking' : screenActiva?.id === 'screen-criterios' ? 'user-menu-criterios' : 'user-menu';
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

function goTo(screenId) {
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
    'ranking-jugadores': 'Jugadores',
    'ranking-once': 'Once ideal',
    'ranking-rentable': 'Once rentable'
  };
  document.title = 'AsturFantasy · ' + (titulos[screenId] || 'AsturFantasy');
  window.scrollTo(0, 0);
  updateBottomNav(screenId);
  const loaders = {
    home: loadHome, lineup: loadLineup, myteam: loadMyTeam,
    ranking: loadRanking, criterios: () => {},
    'ranking-clasificacion': () => {},
    'ranking-jugadores': loadRankingJugadores,
    'ranking-once': loadRankingOnce,
    'ranking-rentable': loadRankingRentable
  };
  if (loaders[screenId]) loaders[screenId]();
}

async function loadRankingRentable() {
  const jornadaRanking = jornadadCerrada() ? JORNADA_ACTIVA : JORNADA_VISIBLE;
  const selectRentable = document.getElementById('rentable-jornada-select');
  if (selectRentable && !selectRentable.options.length) {
    for (let i = JORNADA_ACTIVA; i >= 1; i--) {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = 'Jornada ' + i;
      selectRentable.appendChild(opt);
    }
    selectRentable.value = jornadaRanking;
    selectRentable.addEventListener('change', e => cargarRentable(parseInt(e.target.value)));
  }
  cargarRentable(jornadaRanking);
}

async function cargarRentable(jornada) {
  const container = document.getElementById('rentable-container');
  container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--text-muted)">Cargando...</div>';
  const { data, error } = await db.from('jugadores')
    .select('nombre, club, posicion, puntos, valor, escudo_url, foto_url')
    .eq('jornada', jornada).neq('posicion', 'ENT')
    .gt('valor', 0).gt('puntos', 0)
    .order('puntos', { ascending: false });
  if (error || !data?.length) { container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--text-muted)">Sin datos para esta jornada</div>'; return; }

  // Calcular rentabilidad y ordenar
  const conRentabilidad = data.map(j => ({ ...j, rentabilidad: j.puntos / j.valor }));
  const porPos = { POR:[], DEF:[], MED:[], DEL:[] };
  conRentabilidad.forEach(j => porPos[j.posicion]?.push(j));
  Object.keys(porPos).forEach(pos => porPos[pos].sort((a, b) => b.rentabilidad - a.rentabilidad));

  const portero = porPos.POR.slice(0, 1);
  const defs = porPos.DEF;
  const meds = porPos.MED;
  const dels = porPos.DEL;
  let defOnce = defs.slice(0, 3), medOnce = meds.slice(0, 3), delOnce = dels.slice(0, 1);
  const candidatos = [...defs.slice(3,5).map(j=>({...j,_pos:'DEF'})),...meds.slice(3,4).map(j=>({...j,_pos:'MED'})),...dels.slice(1,3).map(j=>({...j,_pos:'DEL'}))].sort((a,b)=>b.rentabilidad-a.rentabilidad);
  let huecos = 3;
  for (const c of candidatos) {
    if (!huecos) break;
    if (c._pos==='DEF' && defOnce.length<5) { defOnce.push(c); huecos--; }
    else if (c._pos==='MED' && medOnce.length<4) { medOnce.push(c); huecos--; }
    else if (c._pos==='DEL' && delOnce.length<3) { delOnce.push(c); huecos--; }
  }

  const filas = [
    { label: '🧤 PORTERO', jugadores: portero },
    { label: '🛑 DEFENSAS', jugadores: defOnce },
    { label: '🧠 MEDIOS', jugadores: medOnce },
    { label: '⚽ DELANTEROS', jugadores: delOnce },
  ];

  const costeTotal = [...portero,...defOnce,...medOnce,...delOnce].reduce((acc,j)=>acc+j.valor,0);
  const puntosTotal = [...portero,...defOnce,...medOnce,...delOnce].reduce((acc,j)=>acc+j.puntos,0);
  const formacion = defOnce.length + '-' + medOnce.length + '-' + delOnce.length;

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--neon);letter-spacing:2px">Formación: ${formacion}</div>
      <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">
        <div>COSTE: <strong style="color:var(--amber)">${costeTotal.toFixed(1)}M</strong></div>
        <div>PUNTOS: <strong style="color:var(--neon)">${puntosTotal} pts</strong></div>
      </div>
    </div>
    ${filas.map(fila => `
      <div style="margin-bottom:18px">
        <div style="font-family:var(--font-display);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);padding-bottom:5px;margin-bottom:8px">${fila.label}</div>
        ${fila.jugadores.map(j => `
          <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">
            ${j.escudo_url ? '<img loading="lazy" src="' + j.escudo_url + '" width="26" height="26" style="object-fit:contain">' : '<div style="width:26px;height:26px;background:var(--surface);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:9px">' + j.club + '</div>'}
            <div style="flex:1">
              <div style="font-family:var(--font-display);font-weight:600;font-size:14px;color:var(--text)">${j.nombre}</div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">${j.club} · ${j.posicion} · ${j.valor}M</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--font-display);font-weight:700;font-size:18px;color:var(--neon)">${j.puntos} pts</div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--amber)">${j.rentabilidad.toFixed(2)} pts/M</div>
            </div>
          </div>`).join('')}
      </div>`).join('')}`;
}

function updateNavUser(user) {
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  ['', '-lineup', '-myteam', '-ranking', '-criterios'].forEach(s => {
    const av = document.getElementById('nav-avatar' + s);
    const mn = document.getElementById('user-menu-name' + (s || ''));
    const me = document.getElementById('user-menu-email' + (s || ''));
    if (av) { av.textContent = initials; av.title = name; }
    if (mn) mn.textContent = '¡Hola, ' + name.split(' ')[0] + '!';
    if (me) me.textContent = user?.email || '';
  });
}

async function loadRankingJugadores() {
  const { data: jugadores } = await db.from('ranking_jugadores').select('*');
  const clubes = [...new Set((jugadores || []).map(j => j.club))].sort();
  const posiciones = ['POR','DEF','MED','DEL','ENT'];
  document.getElementById('rtab-jugadores').innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <select id="filtro-club" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:7px 10px;font-family:var(--font-display);font-size:13px;cursor:pointer">
        <option value="">Todos los clubes</option>
        ${clubes.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <select id="filtro-pos" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:7px 10px;font-family:var(--font-display);font-size:13px;cursor:pointer">
        <option value="">Todas las posiciones</option>
        ${posiciones.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
      <input id="filtro-nombre" type="text" placeholder="Buscar jugador..." style="padding:7px 10px;font-family:var(--font-mono);font-size:12px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;min-width:140px;">
      <button id="btn-reset-filtros">Reiniciar</button>
    </div>
    <table class="ranking-table">
      <thead><tr><th>#</th><th>Jugador</th><th>Club</th><th style="text-align:right">Pts</th></tr></thead>
      <tbody id="ranking-jugadores-body"></tbody>
    </table>
    <div id="jugadores-paginador"></div>`;
  paginaActual = 1;
  renderJugadoresFn = () => {
    const club = document.getElementById('filtro-club').value;
    const pos = document.getElementById('filtro-pos').value;
    const nombre = document.getElementById('filtro-nombre').value.toLowerCase();
    const filtrados = (jugadores || []).filter(j => (!club || j.club === club) && (!pos || j.posicion === pos) && (!nombre || j.nombre.toLowerCase().includes(nombre)));
    const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
    if (paginaActual > totalPaginas) paginaActual = 1;
    const inicio = (paginaActual - 1) * POR_PAGINA;
    const paginados = filtrados.slice(inicio, inicio + POR_PAGINA);
    const tbody = document.getElementById('ranking-jugadores-body');
    if (!filtrados.length) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:28px">Sin resultados</td></tr>`; return; }
    tbody.innerHTML = paginados.map((j, i) => `
      <tr class="${medalClass(inicio+i+1)}">
        <td><span class="rank-pos ${medalClass(inicio+i+1)}">${inicio+i+1}</span></td>
        <td><div class="rank-name" style="cursor:pointer;text-decoration:underline" onclick="mostrarHistorial('${j.nombre}','${j.club}','${j.posicion}')">${j.nombre}</div><div class="rank-team">${j.posicion}</div></td>
        <td>${j.escudo_url ? `<img loading="lazy" src="${j.escudo_url}" width="22" height="22" style="object-fit:contain;vertical-align:middle;margin-right:4px">` : ''}<span class="rank-team">${j.club}</span></td>
        <td><div class="rank-pts">${j.puntos_total}</div></td>
      </tr>`).join('');
    const paginador = document.getElementById('jugadores-paginador');
    if (paginador) { paginador.innerHTML = totalPaginas > 1 ? `<div style="display:flex;justify-content:center;align-items:center;gap:12px;padding:14px 0"><button onclick="cambiarPagina(-1)" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 14px;cursor:pointer;font-family:var(--font-display);color:var(--text)" ${paginaActual===1?'disabled':''}>← Anterior</button><span style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${paginaActual} / ${totalPaginas}</span><button onclick="cambiarPagina(1)" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 14px;cursor:pointer;font-family:var(--font-display);color:var(--text)" ${paginaActual===totalPaginas?'disabled':''}>Siguiente →</button></div>` : ''; }
  };
  renderJugadoresFn();
  document.getElementById('filtro-club').addEventListener('change', renderJugadoresFn);
  document.getElementById('filtro-pos').addEventListener('change', renderJugadoresFn);
  document.getElementById('filtro-nombre').addEventListener('input', renderJugadoresFn);
  document.getElementById('btn-reset-filtros').addEventListener('click', () => { document.getElementById('filtro-club').value=''; document.getElementById('filtro-pos').value=''; document.getElementById('filtro-nombre').value=''; paginaActual=1; renderJugadoresFn(); });
}

async function loadRankingOnce() {
  const jornadaRanking = jornadadCerrada() ? JORNADA_ACTIVA : JORNADA_VISIBLE;
  const selectOnce = document.getElementById('once-jornada-select');
  if (selectOnce && !selectOnce.options.length) {
    for (let i = JORNADA_ACTIVA; i >= 1; i--) {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = 'Jornada ' + i;
      selectOnce.appendChild(opt);
    }
    selectOnce.value = jornadaRanking;
    selectOnce.addEventListener('change', e => loadOnce(parseInt(e.target.value)));
  }
  loadOnce(jornadaRanking);
}

document.addEventListener('click', e => { const btn = e.target.closest('[data-target]'); if (btn) goTo(btn.dataset.target); });

/* ── 11. AUTENTICACIÓN ───────────────────────────────────── */
async function loginWithGoogle() {
  const { error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
  if (error) showToast('Error al iniciar sesión: ' + error.message, true);
}

async function logout() {
  await db.auth.signOut();
  currentUser = null;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-login').classList.add('active');
  document.getElementById('bottom-nav').style.display = 'none';
}

document.getElementById('btn-google-login').addEventListener('click', loginWithGoogle);
document.querySelectorAll('[data-logout]').forEach(btn => btn.addEventListener('click', logout));
document.getElementById('btn-logout')?.addEventListener('click', logout);

db.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    currentUser = session.user;
    updateNavUser(currentUser);
    registrarNotificaciones();
    if (event === 'SIGNED_IN') {
      document.getElementById('bottom-nav').style.display = 'flex';
      db.from('equipos').select('nombre_equipo, equipo_favorito')
        .eq('user_id', currentUser.id).single()
        .then(({ data: equipoData }) => {
          if (!equipoData?.nombre_equipo) {
            document.getElementById('modal-nombre-equipo').classList.add('open');
          } else if (!equipoData?.equipo_favorito) {
            document.getElementById('modal-equipo-favorito').classList.add('open');
          } else {
            goTo('home');
          }
        });
    }
  } else {
    currentUser = null;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-login').classList.add('active');
    document.getElementById('bottom-nav').style.display = 'none';
  }
});

/* ── 12. HOME ────────────────────────────────────────────── */
async function loadHome() {
  document.getElementById('home-jornada-num').textContent = JORNADA_ACTIVA;
  const { data: sub } = await db.from('push_subscriptions').select('id').eq('user_id', currentUser.id).limit(1);
  actualizarToggleNotif(!!(sub?.length));
  const userName = currentUser?.user_metadata?.full_name?.split(' ')[0] || 'crack';
  const bienvenida = document.getElementById('home-bienvenida');
  const hora = new Date().getHours();
  const saludo = hora < 14 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches';
  if (bienvenida) bienvenida.textContent = '¡' + saludo + ', ' + userName + '!';
  const ahora = new Date();
  const enDirecto = ahora > new Date(DEADLINE_JORNADA) && ahora < new Date(window.FECHA_FIN);
  const bannerAviso = document.getElementById('card-mensaje-home');
  if (bannerAviso) { if (window.MENSAJE_AVISO) { bannerAviso.textContent = window.MENSAJE_AVISO; bannerAviso.style.display = 'block'; } else bannerAviso.style.display = 'none'; }
  const tituloJornada = document.getElementById('titulo-jornada-home');
  if (tituloJornada) tituloJornada.textContent = window.TITULO_JORNADA || '';
  const bannerDirecto = document.getElementById('banner-en-directo');
  if (bannerDirecto) bannerDirecto.style.display = enDirecto ? 'block' : 'none';
  const btnJ = document.getElementById('btn-jornada-visible');
  if (btnJ) btnJ.textContent = JORNADA_VISIBLE;

  if (JORNADA_VISIBLE && currentUser) {
    document.getElementById('stat-jornada-label').textContent = JORNADA_VISIBLE;
    document.getElementById('stat-media-label').textContent = 'jornada ' + JORNADA_VISIBLE;
    const [{ data: clGeneral }, { data: clSemanal }, { data: mediaData }] = await Promise.all([
      db.from('clasificacion_general_auto').select('*'),
      db.from('clasificacion_automatica').select('puntos').eq('jornada', JORNADA_VISIBLE).eq('user_id', currentUser.id).single(),
      db.from('clasificacion_automatica').select('puntos').eq('jornada', JORNADA_VISIBLE)
    ]);
    if (clGeneral?.length) {
      const miPos = clGeneral.findIndex(r => r.user_id === currentUser.id);
      const posEl = document.getElementById('stat-posicion');
      if (posEl) posEl.textContent = miPos >= 0 ? (miPos + 1) + 'º' : '—';
    }
    if (clSemanal?.puntos !== undefined) {
      document.getElementById('stat-puntos').textContent = clSemanal.puntos;
      const media = mediaData?.length ? Math.round(mediaData.reduce((acc, r) => acc + r.puntos, 0) / mediaData.length) : 0;
      const diff = clSemanal.puntos - media;
      const deltaEl = document.getElementById('stat-puntos-delta');
      if (deltaEl) { deltaEl.textContent = diff >= 0 ? '+' + diff + ' vs media' : diff + ' vs media'; deltaEl.style.color = diff >= 0 ? 'var(--neon)' : 'var(--red)'; }
      document.getElementById('stat-media').textContent = media;
    }
  }

  const container = document.getElementById('matches-container');
  if (!PARTIDOS.length) { container.innerHTML = '<div style="text-align:center;padding:32px 20px;font-family:var(--font-display);font-size:15px;color:var(--text-muted);letter-spacing:1px">Próxima jornada por confirmar</div>'; return; }
  container.innerHTML = PARTIDOS.map(p => {
    const localImg = p.local.escudo_url ? '<img loading="lazy" src="' + p.local.escudo_url + '" alt="' + p.local.abrev + '" width="44" height="44" style="object-fit:contain">' : p.local.abrev;
    const visitanteImg = p.visitante.escudo_url ? '<img loading="lazy" src="' + p.visitante.escudo_url + '" alt="' + p.visitante.abrev + '" width="44" height="44" style="object-fit:contain">' : p.visitante.abrev;
    const centro = p.resultado?.finalizado
      ? '<div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--text);letter-spacing:2px">' + p.resultado.local + ' - ' + p.resultado.visitante + '</div><div style="font-family:var(--font-mono);font-size:9px;letter-spacing:2px;color:var(--neon);text-transform:uppercase;margin-bottom:2px">Final</div><button onclick="mostrarPartido(\'' + p.local.abrev + '\',\'' + p.visitante.abrev + '\',\'' + p.local.nombre + '\',\'' + p.visitante.nombre + '\')" style="background:var(--neon);color:#0d1117;border:none;border-radius:20px;padding:5px 12px;cursor:pointer;font-family:var(--font-display);font-weight:700;font-size:9px;letter-spacing:1px;text-transform:uppercase;margin-top:4px;width:100%">Ver puntos</button>'
      : '<div class="match-vs">' + p.estadio + '</div><div class="match-date">' + p.fecha + '</div>';
    return '<div class="match-card"><div class="match-team"><div class="crest" style="color:white;display:flex;align-items:center;justify-content:center">' + localImg + '</div><div><div class="team-name">' + p.local.nombre + '</div></div></div><div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;padding:0 8px;min-width:90px;max-width:110px">' + centro + '</div><div class="match-team right"><div class="crest" style="color:white;display:flex;align-items:center;justify-content:center">' + visitanteImg + '</div><div style="text-align:right"><div class="team-name">' + p.visitante.nombre + '</div></div></div></div>';
  }).join('');
}

/* ── 13. ALINEACIÓN ──────────────────────────────────────── */
const FORMACIONES = {
  '4-3-3': { def:4, mid:3, fwd:3 }, '4-4-2': { def:4, mid:4, fwd:2 },
  '4-5-1': { def:4, mid:5, fwd:1 }, '3-4-3': { def:3, mid:4, fwd:3 },
  '3-5-2': { def:3, mid:5, fwd:2 }, '5-3-2': { def:5, mid:3, fwd:2 },
};
let seleccionados = {};
let jugadoresPorPos = { POR:[], DEF:[], MED:[], DEL:[], ENT:[] };
let capitan = null;

function actualizarSelectCapitan() {
  const sel = document.getElementById('capitan-select');
  if (!sel) return;
  const valorActual = sel.value;
  sel.innerHTML = '<option value="">Elige un capitán</option>';
  Object.values(seleccionados).forEach(j => {
    if (j.posicion === 'ENT') return;
    const opt = document.createElement('option');
    opt.value = j.id; opt.textContent = j.nombre + ' · ' + j.posicion;
    sel.appendChild(opt);
  });
  if ([...sel.options].some(o => o.value === valorActual)) { sel.value = valorActual; capitan = valorActual || null; }
  else capitan = null;
}

async function loadLineup() {
  document.getElementById('lineup-jornada').textContent = JORNADA_ACTIVA;
  cambiosSinGuardar = false;
  const deadlineEl = document.getElementById('deadline-info');
  if (deadlineEl) {
    const fecha = new Date(DEADLINE_JORNADA);
    const fechaFormateada = fecha.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' });
    if (jornadadCerrada()) {
      deadlineEl.innerHTML = '<span class="deadline-cerrado">La jornada comenzó el ' + fechaFormateada + '</span>';
    } else {
      deadlineEl.innerHTML = '<span class="deadline-abierto">Podrás hacer tu once hasta el ' + fechaFormateada + 'h</span><span class="deadline-abierto-card" style="margin-top:6px;margin-bottom:8px" id="countdown-box"><span id="countdown-timer">Calculando...</span></span>';
      const actualizarCuenta = () => {
        const diff = new Date(DEADLINE_JORNADA) - new Date();
        if (diff <= 0) { document.getElementById('countdown-timer').textContent = '¡Plazo cerrado!'; clearInterval(window._countdownIntervalo); return; }
        const dias = Math.floor(diff / 86400000), horas = Math.floor((diff % 86400000) / 3600000);
        const minutos = Math.floor((diff % 3600000) / 60000), segundos = Math.floor((diff % 60000) / 1000);
        const partes = [];
        if (dias > 0) partes.push(dias + 'd');
        if (horas > 0) partes.push(horas + 'h');
        if (minutos > 0) partes.push(minutos + 'm');
        partes.push(segundos + 's');
        document.getElementById('countdown-timer').textContent = 'Quedan ' + partes.join(' ');
      };
      actualizarCuenta();
      if (window._countdownIntervalo) clearInterval(window._countdownIntervalo);
      window._countdownIntervalo = setInterval(actualizarCuenta, 1000);
    }
  }
  if (jornadadCerrada()) {
    const pitch = document.getElementById('pitch');
    pitch.querySelectorAll('.pitch-row').forEach(r => r.remove());
    pitch.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:16px;position:relative;z-index:1"><div style="font-size:48px">🔒</div><div style="font-family:var(--font-display);font-size:26px;font-weight:700;color:white;letter-spacing:2px;text-align:center">JORNADA CERRADA</div><div style="font-family:var(--font-mono);font-size:11px;color:rgba(255,255,255,0.5);text-align:center;letter-spacing:1px">La J' + JORNADA_ACTIVA + ' ya ha empezado<br>Es tarde para modificar tu alineación</div></div>';
    ['btn-save-lineup','btn-clear-lineup','btn-export-png'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    const cw = document.getElementById('capitan-wrapper'); if (cw) cw.style.display = 'none';
    const bc = document.getElementById('btn-consultar-equipo'); if (bc) bc.style.display = 'block';
    return;
  }
  ['btn-save-lineup','btn-clear-lineup','btn-export-png'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
  const cw = document.getElementById('capitan-wrapper'); if (cw) cw.style.display = '';
  const bc = document.getElementById('btn-consultar-equipo'); if (bc) bc.style.display = 'none';
  seleccionados = {}; capitan = null;
  const sel = document.getElementById('capitan-select');
  if (sel) sel.innerHTML = '<option value="">— Elige tu capitán —</option>';
  const { data, error } = await db.from('jugadores').select('*').eq('jornada', JORNADA_ACTIVA).order('puntos', { ascending: false });
  if (error) { showToast('Error cargando jugadores', true); return; }
  const { data: rankingData } = await db.from('ranking_jugadores').select('nombre, club, puntos_total');
  const puntosMap = {};
  (rankingData || []).forEach(r => { puntosMap[r.nombre + '-' + r.club] = r.puntos_total; });
  (data || []).forEach(j => { j.puntos_total = puntosMap[j.nombre + '-' + j.club] ?? j.puntos; });
  jugadoresPorPos = { POR:[], DEF:[], MED:[], DEL:[], ENT:[] };
  (data || []).forEach(j => { if (jugadoresPorPos[j.posicion]) jugadoresPorPos[j.posicion].push(j); });
  Object.keys(jugadoresPorPos).forEach(pos => { jugadoresPorPos[pos].sort((a, b) => (b.puntos_total ?? 0) - (a.puntos_total ?? 0)); });
  if (currentUser) {
    const { data: eg } = await db.from('mi_equipo').select('jugador_id, formacion, capitan').eq('user_id', currentUser.id).eq('jornada', JORNADA_ACTIVA);
    if (eg?.length) {
      document.getElementById('formation-select').value = eg[0].formacion;
      const contadores = { POR:0, DEF:0, MED:0, DEL:0, ENT:0 };
      const idsG = eg.map(e => e.jugador_id);
      const jg = data.filter(j => idsG.includes(j.id));
      const ordenPos = ['POR','DEF','MED','DEL','ENT'];
      jg.sort((a,b) => ordenPos.indexOf(a.posicion) - ordenPos.indexOf(b.posicion))
        .forEach(j => { const slotId = j.posicion + '-' + contadores[j.posicion]; seleccionados[slotId] = j; contadores[j.posicion]++; });
      const capG = eg.find(e => e.capitan === true || e.capitan === 1);
      const capId = capG ? capG.jugador_id : null;
      actualizarSelectCapitan();
      if (capId) document.getElementById('capitan-select').value = capId;
      capitan = capId;
    }
  }
  setTimeout(() => { renderPitch(); actualizarPresupuesto(); }, 100);
}

async function exportarAlineacion() {
  const btn = document.getElementById('btn-export-png');
  btn.disabled = true; btn.textContent = 'GENERANDO...';
  const { data: ed } = await db.from('equipos').select('nombre_equipo').eq('user_id', currentUser.id).single();
  document.getElementById('export-nombre-equipo').textContent = ed?.nombre_equipo || 'Mi Equipo';
  document.getElementById('export-formacion').textContent = document.getElementById('formation-select')?.value || '—';
  document.getElementById('export-jornada').textContent = JORNADA_ACTIVA;
  const area = document.getElementById('export-area');
  const header = document.getElementById('export-header');
  area.style.display = 'block'; header.style.display = 'flex';
  const canvas = await html2canvas(area, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: '#0d1117' });
  area.style.display = ''; header.style.display = 'none';
  btn.disabled = false; btn.textContent = 'EXPORTAR ALINEACIÓN';
  if (canvas.width === 0 || canvas.height === 0) { showToast('Error al generar la imagen', true); return; }
  const link = document.createElement('a');
  link.download = 'asturfantasy-j' + JORNADA_ACTIVA + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('Alineación exportada');
}

function renderPitch() {
  const formacion = document.getElementById('formation-select').value;
  const { def, mid, fwd } = FORMACIONES[formacion];
  const pitch = document.getElementById('pitch');
  pitch.querySelectorAll('.pitch-row').forEach(r => r.remove());
  const stripes = document.getElementById('pitch-stripes');
  stripes.innerHTML = '';
  for (let i = 0; i < 10; i++) { const d = document.createElement('div'); d.className = 'pitch-stripe'; stripes.appendChild(d); }
  const filas = [{ pos:'DEL', count:fwd, cls:'fwd' }, { pos:'MED', count:mid, cls:'mid' }, { pos:'DEF', count:def, cls:'def' }, { pos:'POR', count:1, cls:'gk' }, { pos:'ENT', count:1, cls:'ent' }];
  filas.forEach(fila => {
    const row = document.createElement('div'); row.className = 'pitch-row';
    for (let i = 0; i < fila.count; i++) {
      const slotId = fila.pos + '-' + i;
      const jugador = seleccionados[slotId];
      const slot = document.createElement('div'); slot.className = 'player-slot'; slot.dataset.slot = slotId;
      if (jugador) {
        const esCap = capitan !== null && String(capitan) === String(jugador.id);
        const noDisp = jugador.activo === 0 || jugador.activo === '0';
        const overlay = noDisp ? '<div style="position:absolute;inset:0;border-radius:50%;background:rgba(220,38,38,0.5);z-index:1;pointer-events:none"></div>' : '';
        const contenido = jugador.foto_url ? '<img loading="lazy" src="' + jugador.foto_url + '" alt="' + jugador.nombre + '" width="46" height="46" style="object-fit:cover;border-radius:50%" onerror="this.style.display=\'none\'">' : jugador.nombre.substring(0,3).toUpperCase();
        const escudito = jugador.escudo_url ? '<img loading="lazy" src="' + jugador.escudo_url + '" alt="' + jugador.club + '" width="16" height="16" style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;border-radius:50%;background:white;border:1px solid rgba(0,0,0,0.2);z-index:2">' : '';
        slot.innerHTML = '<div class="player-circle ' + fila.cls + (esCap ? ' es-capitan' : '') + '" style="overflow:visible;position:relative;' + (noDisp ? 'border:3px solid rgba(220,38,38,0.9);' : '') + '">' + contenido + overlay + escudito + (esCap ? '<span class="cap-badge">C</span>' : '') + '</div><div class="player-name">' + jugador.nombre + '</div><div class="pos-badge">' + (esCap ? '⭐ Cap.' : jugador.club) + '</div>';
      } else {
        slot.innerHTML = '<div class="player-circle ' + fila.cls + ' empty">+</div><div class="player-name" style="color:rgba(255,255,255,.3)">' + fila.pos + '</div><div class="pos-badge">–</div>';
      }
      slot.addEventListener('click', () => openModal(slotId, fila.pos, fila.cls));
      row.appendChild(slot);
    }
    pitch.appendChild(row);
  });
}

function openModal(slotId, posicion, cls) {
  const labels = { POR:'Portero', DEF:'Defensa', MED:'Mediocampista', DEL:'Delantero', ENT:'Entrenador' };
  document.getElementById('modal-title').textContent = 'Seleccionar ' + labels[posicion];
  const usados = new Set(Object.values(seleccionados).map(j => j.id));
  const list = document.getElementById('modal-list');
  const colores = { gk:'var(--pos-gk)', def:'var(--pos-def)', mid:'var(--pos-mid)', fwd:'var(--pos-fwd)', ent:'var(--pos-ent)' };
  const textoCols = { gk:'#0d1117', def:'white', mid:'#0d1117', fwd:'white', ent:'white' };
  const getDisp = () => (PRESUPUESTO - Object.values(seleccionados).reduce((acc, j) => acc + (j.valor || 0), 0)).toFixed(1);
  let soloDisp = false;
  list.innerHTML = '<div style="padding:12px 16px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg2);z-index:1"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:1px">PRESUPUESTO</span><span id="modal-presupuesto" style="font-family:var(--font-display);font-weight:700;font-size:16px;color:var(--neon)">' + getDisp() + 'M</span></div><input id="modal-search" type="text" placeholder="Buscar jugador..." style="width:100%;padding:7px 10px;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);margin-bottom:6px"><button id="btn-vaciar-posicion" style="width:100%;padding:7px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-family:var(--font-display);font-weight:600;font-size:12px;cursor:pointer;">🗑 Vaciar posición</button><button id="btn-filtro-presupuesto" style="width:100%;padding:7px;background:var(--neon);color:#0d1117;border:none;border-radius:6px;font-family:var(--font-display);font-weight:700;font-size:12px;cursor:pointer;margin-top:5px;">Dentro del presupuesto</button></div><div id="modal-players"></div>';
  document.getElementById('btn-vaciar-posicion').addEventListener('click', () => { delete seleccionados[slotId]; capitan = null; closeModal(); renderPitch(); actualizarSelectCapitan(); actualizarPresupuesto(); });
  document.getElementById('btn-filtro-presupuesto').addEventListener('click', () => {
    soloDisp = !soloDisp;
    const btn = document.getElementById('btn-filtro-presupuesto');
    btn.textContent = soloDisp ? '👁 Mostrar todos' : 'Dentro del presupuesto';
    btn.style.background = soloDisp ? 'var(--amber)' : 'var(--neon)';
    renderLista(document.getElementById('modal-search').value);
  });
  const renderLista = (filtro = '') => {
    const disponible = parseFloat(getDisp());
    const mp = document.getElementById('modal-presupuesto');
    if (mp) { mp.textContent = disponible.toFixed(1) + 'M'; mp.style.color = disponible < 0 ? 'var(--red)' : disponible < 10 ? 'var(--amber)' : 'var(--neon)'; }
    const filtrados = jugadoresPorPos[posicion].filter(j => (j.nombre.toLowerCase().includes(filtro.toLowerCase()) || j.club.toLowerCase().includes(filtro.toLowerCase())) && (!soloDisp || (j.valor || 0) <= disponible));
    document.getElementById('modal-players').innerHTML = filtrados.map(j => {
      const usado = usados.has(j.id);
      const noD = j.activo === 0 || j.activo === '0';
      const bR = noD ? '3px solid rgba(220,38,38,0.9)' : '1px solid var(--border)';
      const esc = '<div style="position:relative;width:36px;height:36px;flex-shrink:0">' + (j.foto_url ? '<img loading="lazy" src="' + j.foto_url + '" width="36" height="36" style="object-fit:cover;border-radius:50%;border:' + bR + '" onerror="this.style.display=\'none\'">' : '<div style="width:36px;height:36px;border-radius:50%;background:' + colores[cls] + ';color:' + textoCols[cls] + ';display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:12px;border:' + bR + '">' + j.nombre.substring(0,2).toUpperCase() + '</div>') + (j.escudo_url ? '<img loading="lazy" src="' + j.escudo_url + '" width="13" height="13" style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;border-radius:50%;background:white;border:1px solid rgba(0,0,0,0.2)">' : '') + '</div>';
      return '<div class="modal-player" data-id="' + j.id + '" data-slot="' + slotId + '" style="opacity:' + (usado ? '0.3' : '1') + ';pointer-events:' + (usado ? 'none' : 'auto') + '">' + esc + '<div><div class="modal-player-name">' + j.nombre + '</div><div class="modal-player-meta">' + j.club + ' · ' + j.posicion + (j.rival ? ' · vs ' + j.rival + ' (' + (j.es_local ? '🏠' : '✈️') + ')' : '') + '</div></div><div style="text-align:right"><div class="modal-player-pts">' + (posicion === 'ENT' ? (j.puntos_entrenador || 0) : j.puntos_total) + '</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--amber)">' + (j.valor || 0) + 'M</div></div></div>';
    }).join('');
    document.querySelectorAll('.modal-player').forEach(el => {
      el.addEventListener('click', () => { seleccionados[slotId] = jugadoresPorPos[posicion].find(j => j.id === el.dataset.id); cambiosSinGuardar = true; closeModal(); renderPitch(); actualizarSelectCapitan(); actualizarPresupuesto(); });
    });
  };
  renderLista();
  document.getElementById('modal-search').addEventListener('input', e => renderLista(e.target.value));
  document.getElementById('modal-list').scrollTop = 0;
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
document.getElementById('historial-close')?.addEventListener('click', () => document.getElementById('modal-historial').classList.remove('open'));
document.getElementById('modal-historial')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

document.getElementById('formation-select').addEventListener('change', () => {
  const { def, mid, fwd } = FORMACIONES[document.getElementById('formation-select').value];
  const maxPorPos = { POR:1, DEF:def, MED:mid, DEL:fwd, ENT:1 };
  Object.keys(seleccionados).forEach(slotId => {
    const [pos, idx] = slotId.split('-');
    if (parseInt(idx) >= maxPorPos[pos]) { if (capitan === seleccionados[slotId]?.id) { capitan = null; const s = document.getElementById('capitan-select'); if (s) s.value = ''; } delete seleccionados[slotId]; }
  });
  actualizarSelectCapitan(); renderPitch();
});

document.getElementById('capitan-select')?.addEventListener('change', e => { if (e.isTrusted) { capitan = e.target.value || null; cambiosSinGuardar = true; renderPitch(); } });

document.getElementById('btn-save-lineup').addEventListener('click', async () => {
  if (!currentUser) { showToast('Debes iniciar sesión', true); return; }
  const formacion = document.getElementById('formation-select').value;
  const { def, mid, fwd } = FORMACIONES[formacion];
  if (Object.keys(seleccionados).length < 1 + def + mid + fwd + 1) { showToast('¡Faltan jugadores por seleccionar!', true); return; }
  if (Object.values(seleccionados).reduce((acc, j) => acc + (j.valor || 0), 0) > PRESUPUESTO) { showToast('Has superado el presupuesto', true); return; }
  const btn = document.getElementById('btn-save-lineup');
  btn.disabled = true; btn.textContent = 'GUARDANDO...';
  await db.from('mi_equipo').delete().eq('user_id', currentUser.id).eq('jornada', JORNADA_ACTIVA);
  const { error } = await db.from('mi_equipo').insert(Object.values(seleccionados).map(jugador => ({ user_id: currentUser.id, jugador_id: jugador.id, jornada: JORNADA_ACTIVA, formacion, capitan: capitan === jugador.id })));
  btn.disabled = false; btn.textContent = 'GUARDAR ALINEACIÓN';
  if (error) showToast('Error al guardar: ' + error.message, true);
  else { cambiosSinGuardar = false; showToast('Alineación guardada'); }
});

document.getElementById('btn-clear-lineup').addEventListener('click', async () => {
  if (!currentUser || !confirm('¿Seguro que quieres vaciar tu alineación?')) return;
  const btn = document.getElementById('btn-clear-lineup');
  btn.disabled = true; btn.textContent = 'VACIANDO...';
  await db.from('mi_equipo').delete().eq('user_id', currentUser.id).eq('jornada', JORNADA_ACTIVA);
  seleccionados = {}; capitan = null;
  const sel = document.getElementById('capitan-select');
  if (sel) sel.innerHTML = '<option value="">— Elige tu capitán —</option>';
  btn.disabled = false; btn.textContent = 'VACIAR ALINEACIÓN';
  renderPitch(); showToast('Alineación vaciada');
});

/* ── 14. MI EQUIPO ───────────────────────────────────────── */
const POS_COLORS = { POR:'var(--pos-gk)', DEF:'var(--pos-def)', MED:'var(--pos-mid)', DEL:'var(--pos-fwd)', ENT:'var(--pos-ent)' };
const POS_TEXT = { POR:'#0d1117', DEF:'white', MED:'#0d1117', DEL:'white', ENT:'white' };

async function mostrarDesgloseMyTeam(jugadorId, nombre, posicion, jornada) {
  if (!jornada) jornada = JORNADA_VISIBLE;
  const modal = document.getElementById('modal-desglose');
  const content = document.getElementById('desglose-content');
  document.getElementById('desglose-titulo').textContent = nombre;
  modal.classList.add('open');
  const { data, error } = await db.from('jugadores').select('minutos, puerta_cero, lne, gol, asistencia, penalti, gol_pp, amarilla, doble_amarilla, roja, total_jornada, puntos_entrenador, goles_encajados').eq('id', jugadorId).eq('jornada', jornada).single();
  if (error || !data) { content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin datos</div>'; return; }
  const items = desgloseFn({ ...data, posicion, nombre });
  content.innerHTML = items.map(item => '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-family:var(--font-body);font-size:13px;color:var(--text-muted)">' + item.label + '</span><span style="font-family:var(--font-display);font-weight:700;font-size:15px;color:' + (item.pts >= 0 ? 'var(--neon)' : 'var(--red)') + '">' + (item.pts > 0 ? '+' : '') + item.pts + '</span></div>').join('') + '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;margin-top:4px"><span style="font-family:var(--font-display);font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:var(--text)">Total</span><span style="font-family:var(--font-display);font-weight:700;font-size:24px;color:var(--neon)">' + data.total_jornada + '</span></div>';
}

async function loadMyTeam() {
  if (!currentUser) return;
  const selectMyTeam = document.getElementById('myteam-jornada-select');
  if (selectMyTeam) {
    selectMyTeam.innerHTML = '';
    for (let i = JORNADA_VISIBLE; i >= 1; i--) {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = i === JORNADA_VISIBLE ? 'J' + i + ' · Actual' : 'J' + i;
      selectMyTeam.appendChild(opt);
    }
    selectMyTeam.value = jornadadCerrada() ? JORNADA_ACTIVA : JORNADA_VISIBLE;
    selectMyTeam.onchange = e => cargarMyTeam(parseInt(e.target.value));
  }
  await cargarMyTeam(jornadadCerrada() ? JORNADA_ACTIVA : JORNADA_VISIBLE);
}

async function cargarMyTeam(jornada) {
  if (!currentUser) return;
  document.getElementById('myteam-jornada-num').textContent = jornada;
  const { data, error } = await db.from('mi_equipo_detalle').select('*').eq('user_id', currentUser.id).eq('jornada', jornada).order('posicion');
  const grid = document.getElementById('myteam-grid');
  const empty = document.getElementById('myteam-empty');
  const banner = document.getElementById('myteam-banner');
  if (error || !data?.length) { grid.innerHTML = ''; banner.style.display = 'none'; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  const ids = data.map(j => j.jugador_id);
  const { data: jugData } = await db.from('jugadores').select('id, escudo_url, foto_url, valor').in('id', ids);
  const escudoMap = {}, fotoMap = {}, valorMap = {};
  (jugData || []).forEach(j => { escudoMap[j.id] = j.escudo_url; fotoMap[j.id] = j.foto_url; valorMap[j.id] = j.valor; });
  const { data: capData } = await db.from('mi_equipo').select('jugador_id').eq('user_id', currentUser.id).eq('jornada', jornada).eq('capitan', true).single();
  const capitanId = capData?.jugador_id || null;
  const orden = ['POR','DEF','MED','DEL','ENT'];
  const sorted = [...data].sort((a,b) => orden.indexOf(a.posicion) - orden.indexOf(b.posicion));
  const totalPuntos = sorted.reduce((acc, j) => { const pts = j.puntos || 0; return acc + (j.jugador_id === capitanId ? pts * 2 : pts); }, 0);
  const formacion = data[0]?.formacion || '—';
  const { data: mediaData } = await db.from('clasificacion_automatica').select('puntos').eq('jornada', jornada);
  const media = mediaData?.length ? Math.round(mediaData.reduce((acc, r) => acc + r.puntos, 0) / mediaData.length) : 0;
  banner.style.display = 'block';
  banner.innerHTML = '<div class="saved-sub" style="text-align:center">Formación <strong>' + formacion + '</strong> · Jornada ' + jornada + '</div><div class="saved-pts-high" style="text-align:center"><strong>' + totalPuntos + ' PUNTOS</strong></div><div class="saved-sub" style="text-align:center;margin-top:6px">Media de la jornada: <strong>' + media + ' pts</strong></div>';
  grid.innerHTML = sorted.map(j => {
    const foto = fotoMap[j.jugador_id];
    const escudo = escudoMap[j.jugador_id];
    const esC = j.jugador_id === capitanId;
    const pts = esC ? j.puntos * 2 : j.puntos;
    const avatar = foto ? '<img loading="lazy" src="' + foto + '" width="40" height="40" style="object-fit:cover;border-radius:50%" onerror="this.style.display=\'none\'">' : j.nombre.substring(0,2).toUpperCase();
    return '<div class="player-card ' + (esC ? 'card-capitan' : '') + '" style="cursor:pointer" onclick="mostrarDesgloseMyTeam(\'' + j.jugador_id + '\',\'' + j.nombre + '\',\'' + j.posicion + '\',' + jornada + ')"><div class="pc-avatar" style="position:relative;background:' + POS_COLORS[j.posicion] + ';color:' + POS_TEXT[j.posicion] + ';overflow:visible">' + avatar + (escudo ? '<img loading="lazy" src="' + escudo + '" width="14" height="14" style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;border-radius:50%;background:white;border:1px solid rgba(0,0,0,0.2)">' : '') + '</div><div class="pc-info"><div class="pc-name">' + j.nombre + (esC ? ' ⭐' : '') + '</div><div class="pc-meta">' + j.posicion + ' · ' + j.club + ' · ' + (valorMap[j.jugador_id] || 0) + 'M' + (esC ? ' · Cap.' : '') + '</div></div><div class="pc-pts">' + pts + '</div></div>';
  }).join('');
  const { data: ed } = await db.from('equipos').select('nombre_equipo').eq('user_id', currentUser.id).single();
  const inp = document.getElementById('input-nombre-equipo');
  if (inp && ed?.nombre_equipo) inp.value = ed.nombre_equipo;
}

/* ── 15. CLASIFICACIÓN — NUEVA ESTRUCTURA ────────────────── */
const medalClass = pos => pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : '';

function toggleRankingCard(id) {
  const detail = document.getElementById('detail-' + id);
  const chevron = document.getElementById('chevron-' + id);
  if (!detail) return;
  const isOpen = detail.style.display !== 'none';
  detail.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

function cambiarSubtab(tab) {
  ['general','semanal','pena'].forEach(t => {
    const el = document.getElementById('subtab-' + t);
    if (el) el.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.ranking-subtab').forEach(btn => btn.classList.toggle('active', btn.dataset.subtab === tab));
}

function mostrarTablaRanking(tipo) {
  const detail = document.getElementById('detail-clasificacion');
  const chevron = document.getElementById('chevron-clasificacion');
  if (detail) { detail.style.display = 'block'; if (chevron) chevron.style.transform = 'rotate(180deg)'; }
  cambiarSubtab(tipo);
}

async function loadRanking() {
  const jornadaRanking = jornadadCerrada() ? JORNADA_ACTIVA : JORNADA_VISIBLE;
  document.getElementById('ranking-jornada-num').textContent = jornadaRanking;

  const { data: equipoData } = await db.from('equipos').select('equipo_favorito').eq('user_id', currentUser.id).single();
  const equipoFav = equipoData?.equipo_favorito;
  const clubInfo = CLUBES_INFO[equipoFav] || null;

  if (clubInfo) {
    const lbl = document.getElementById('metric-pena-label');
    if (lbl) lbl.textContent = clubInfo.nombre;
    const esc = document.getElementById('pena-escudo');
    const nom = document.getElementById('pena-nombre');
    if (esc) { esc.src = clubInfo.escudo; esc.style.display = 'block'; }
    if (nom) nom.textContent = 'Liga ' + clubInfo.nombre;
  }

  // General
  const { data: general } = await db.from('clasificacion_general_auto').select('*');
  const tbodyG = document.getElementById('ranking-general-body');
  if (!general?.length) {
    tbodyG.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:28px">Sin datos</td></tr>';
  } else {
    const miPosG = general.findIndex(r => r.user_id === currentUser?.id);
    const mpG = document.getElementById('metric-pos-general');
    if (mpG) mpG.textContent = miPosG >= 0 ? (miPosG + 1) + 'º' : '—';
    tbodyG.innerHTML = general.map((r, i) => {
      const esYo = r.user_id === currentUser?.id;
      return '<tr class="' + medalClass(i+1) + '" style="' + (esYo ? 'outline:2px solid var(--neon);outline-offset:-2px;' : '') + '"><td><span class="rank-pos ' + medalClass(i+1) + '">' + (i+1) + '</span></td><td><div class="rank-team">' + (esYo ? '⭐ ' : '') + r.nombre_equipo + '</div></td><td><div style="display:flex;align-items:center;gap:8px;justify-content:flex-end"><div class="rank-pts">' + r.puntos_total + '</div>' + (esYo ? '<button onclick="compartirClasificacion(\'' + r.nombre_equipo + '\',' + (i+1) + ',' + r.puntos_total + ')" style="background:var(--neon);color:#0d1117;border:none;border-radius:20px;padding:4px 10px;cursor:pointer;font-family:var(--font-display);font-weight:700;font-size:10px;white-space:nowrap">COMPARTIR</button>' : '') + '</div></td></tr>';
    }).join('');
  }

  // Semanal
  const cargarSemanal = async (jornadaSel) => {
    const { data: semanal } = await db.from('clasificacion_automatica').select('*').eq('jornada', jornadaSel).order('puntos', { ascending: false });
    const tbody = document.getElementById('ranking-body');
    if (!semanal?.length) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:28px">Sin datos para la jornada ' + jornadaSel + '</td></tr>';
    } else {
      const miPosS = semanal.findIndex(r => r.user_id === currentUser?.id);
      const mpS = document.getElementById('metric-pos-jornada');
      if (mpS) mpS.textContent = miPosS >= 0 ? (miPosS + 1) + 'º' : '—';
      tbody.innerHTML = semanal.map((r, i) => '<tr class="' + medalClass(i+1) + '"><td><span class="rank-pos ' + medalClass(i+1) + '">' + (i+1) + '</span></td><td><div class="rank-team">' + r.nombre_equipo + '</div></td><td><div class="rank-pts">' + r.puntos + '</div></td></tr>').join('');
    }
  };
  const selectSemanal = document.getElementById('semanal-jornada-select');
  if (selectSemanal) {
    selectSemanal.innerHTML = '';
    for (let i = JORNADA_ACTIVA; i >= 1; i--) { const opt = document.createElement('option'); opt.value = i; opt.textContent = 'Jornada ' + i; selectSemanal.appendChild(opt); }
    selectSemanal.value = jornadaRanking;
    cargarSemanal(jornadaRanking);
    selectSemanal.addEventListener('change', e => cargarSemanal(parseInt(e.target.value)));
  }

  // Peña
  if (equipoFav) {
    const { data: penaAll } = await db.from('clasificacion_general_auto').select('*');
    const { data: equiposFav } = await db.from('equipos').select('user_id').eq('equipo_favorito', equipoFav);
    const userIdsFav = new Set((equiposFav || []).map(e => e.user_id));
    const penaFiltrada = (penaAll || []).filter(r => userIdsFav.has(r.user_id));
    const miPosP = penaFiltrada.findIndex(r => r.user_id === currentUser?.id);
    const mpP = document.getElementById('metric-pos-pena');
    if (mpP) mpP.textContent = miPosP >= 0 ? (miPosP + 1) + 'º' : '—';
    const tbodyP = document.getElementById('ranking-pena-body');
    if (tbodyP) {
      tbodyP.innerHTML = !penaFiltrada.length
        ? '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:28px">Solo tú en esta peña de momento</td></tr>'
        : penaFiltrada.map((r, i) => { const esYo = r.user_id === currentUser?.id; return '<tr class="' + medalClass(i+1) + '" style="' + (esYo ? 'outline:2px solid var(--neon);outline-offset:-2px;' : '') + '"><td><span class="rank-pos ' + medalClass(i+1) + '">' + (i+1) + '</span></td><td><div class="rank-team">' + (esYo ? '⭐ ' : '') + r.nombre_equipo + '</div></td><td><div class="rank-pts">' + r.puntos_total + '</div></td></tr>'; }).join('');
    }
  }

  // Jugadores
  const { data: jugadores } = await db.from('ranking_jugadores').select('*');
  const clubes = [...new Set((jugadores || []).map(j => j.club))].sort();
  const posiciones = ['POR','DEF','MED','DEL','ENT'];
  document.getElementById('rtab-jugadores').innerHTML = '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap"><select id="filtro-club" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:7px 10px;font-family:var(--font-display);font-size:13px;cursor:pointer"><option value="">Todos los clubes</option>' + clubes.map(c => '<option value="' + c + '">' + c + '</option>').join('') + '</select><select id="filtro-pos" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:7px 10px;font-family:var(--font-display);font-size:13px;cursor:pointer"><option value="">Todas las posiciones</option>' + posiciones.map(p => '<option value="' + p + '">' + p + '</option>').join('') + '</select><input id="filtro-nombre" type="text" placeholder="Buscar jugador..." style="padding:7px 10px;font-family:var(--font-mono);font-size:12px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;min-width:140px;"><button id="btn-reset-filtros">Reiniciar</button></div><table class="ranking-table"><thead><tr><th>#</th><th>Jugador</th><th>Club</th><th style="text-align:right">Pts</th></tr></thead><tbody id="ranking-jugadores-body"></tbody></table><div id="jugadores-paginador"></div>';
  paginaActual = 1;
  renderJugadoresFn = () => {
    const club = document.getElementById('filtro-club').value;
    const pos = document.getElementById('filtro-pos').value;
    const nombre = document.getElementById('filtro-nombre').value.toLowerCase();
    const filtrados = (jugadores || []).filter(j => (!club || j.club === club) && (!pos || j.posicion === pos) && (!nombre || j.nombre.toLowerCase().includes(nombre)));
    const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
    if (paginaActual > totalPaginas) paginaActual = 1;
    const inicio = (paginaActual - 1) * POR_PAGINA;
    const paginados = filtrados.slice(inicio, inicio + POR_PAGINA);
    const tbody = document.getElementById('ranking-jugadores-body');
    if (!filtrados.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:28px">Sin resultados</td></tr>'; return; }
    tbody.innerHTML = paginados.map((j, i) => '<tr class="' + medalClass(inicio+i+1) + '"><td><span class="rank-pos ' + medalClass(inicio+i+1) + '">' + (inicio+i+1) + '</span></td><td><div class="rank-name" style="cursor:pointer;text-decoration:underline" onclick="mostrarHistorial(\'' + j.nombre + '\',\'' + j.club + '\',\'' + j.posicion + '\')">' + j.nombre + '</div><div class="rank-team">' + j.posicion + '</div></td><td>' + (j.escudo_url ? '<img loading="lazy" src="' + j.escudo_url + '" width="22" height="22" style="object-fit:contain;vertical-align:middle;margin-right:4px" onerror="this.style.display=\'none\'">' : '') + '<span class="rank-team">' + j.club + '</span></td><td><div class="rank-pts">' + j.puntos_total + '</div></td></tr>').join('');
    const paginador = document.getElementById('jugadores-paginador');
    if (paginador) { paginador.innerHTML = totalPaginas > 1 ? '<div style="display:flex;justify-content:center;align-items:center;gap:12px;padding:14px 0"><button onclick="cambiarPagina(-1)" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 14px;cursor:pointer;font-family:var(--font-display);color:var(--text)" ' + (paginaActual === 1 ? 'disabled' : '') + '>← Anterior</button><span style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">' + paginaActual + ' / ' + totalPaginas + '</span><button onclick="cambiarPagina(1)" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 14px;cursor:pointer;font-family:var(--font-display);color:var(--text)" ' + (paginaActual === totalPaginas ? 'disabled' : '') + '>Siguiente →</button></div>' : ''; }
  };
  renderJugadoresFn();
  document.getElementById('filtro-club').addEventListener('change', renderJugadoresFn);
  document.getElementById('filtro-pos').addEventListener('change', renderJugadoresFn);
  document.getElementById('filtro-nombre').addEventListener('input', renderJugadoresFn);
  document.getElementById('btn-reset-filtros').addEventListener('click', () => { document.getElementById('filtro-club').value = ''; document.getElementById('filtro-pos').value = ''; document.getElementById('filtro-nombre').value = ''; paginaActual = 1; renderJugadoresFn(); });

  // Once ideal
  const selectOnce = document.getElementById('once-jornada-select');
  if (selectOnce) {
    selectOnce.innerHTML = '';
    for (let i = JORNADA_ACTIVA; i >= 1; i--) { const opt = document.createElement('option'); opt.value = i; opt.textContent = 'Jornada ' + i; selectOnce.appendChild(opt); }
    selectOnce.value = jornadaRanking;
    loadOnce(jornadaRanking);
    selectOnce.addEventListener('change', e => loadOnce(parseInt(e.target.value)));
  }
}

async function compartirClasificacion(nombreEquipo, posicion, puntos) {
  const emoji = posicion === 1 ? '🥇' : posicion === 2 ? '🥈' : posicion === 3 ? '🥉' : '⚽';
  const texto = emoji + ' Voy ' + posicion + 'º en AsturFantasy con ' + puntos + ' puntos!\n🏆 Equipo: ' + nombreEquipo + '\nasturfantasy.com';
  if (navigator.share) await navigator.share({ text: texto });
  else { await navigator.clipboard.writeText(texto); showToast('Copiado al portapapeles'); }
}

/* ── 16. GUARDAR EQUIPO ──────────────────────────────────── */
async function guardarNombreEquipo() {
  if (!currentUser) return;
  const nombre = document.getElementById('input-nombre-equipo').value.trim();
  if (!nombre) { showToast('Escribe un nombre para tu equipo', true); return; }
  const btn = document.getElementById('btn-guardar-equipo');
  btn.disabled = true; btn.textContent = 'Guardando...';
  const { error } = await db.from('equipos').upsert({ user_id: currentUser.id, nombre_equipo: nombre }, { onConflict: 'user_id' });
  btn.disabled = false; btn.textContent = 'Guardar nombre';
  if (error) { showToast(error.message.includes('equipos_nombre_equipo_unique') ? 'Ese nombre ya está en uso' : 'Error al guardar: ' + error.message, true); }
  else showToast('Nombre de equipo guardado');
}

document.getElementById('btn-guardar-equipo')?.addEventListener('click', guardarNombreEquipo);
document.getElementById('btn-export-png')?.addEventListener('click', exportarAlineacion);

/* ── 17. ONCE IDEAL ──────────────────────────────────────── */
async function loadOnce(jornada) {
  const container = document.getElementById('once-container');
  container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--text-muted)">Cargando...</div>';
  const { data, error } = await db.from('jugadores').select('nombre, club, posicion, puntos, escudo_url, foto_url').eq('jornada', jornada).neq('posicion', 'ENT').order('puntos', { ascending: false }).order('valor', { ascending: true });
  if (error || !data?.length) { container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--text-muted)">Sin datos para esta jornada</div>'; return; }
  const porPos = { POR:[], DEF:[], MED:[], DEL:[] };
  data.forEach(j => porPos[j.posicion]?.push(j));
  const portero = porPos.POR.sort((a,b) => b.puntos - a.puntos).slice(0,1);
  const defs = porPos.DEF.sort((a,b) => b.puntos - a.puntos);
  const meds = porPos.MED.sort((a,b) => b.puntos - a.puntos);
  const dels = porPos.DEL.sort((a,b) => b.puntos - a.puntos);
  let defOnce = defs.slice(0,3), medOnce = meds.slice(0,3), delOnce = dels.slice(0,1);
  const candidatos = [...defs.slice(3,5).map(j=>({...j,_pos:'DEF'})),...meds.slice(3,4).map(j=>({...j,_pos:'MED'})),...dels.slice(1,3).map(j=>({...j,_pos:'DEL'}))].sort((a,b)=>b.puntos-a.puntos);
  let huecos = 3;
  for (const c of candidatos) {
    if (!huecos) break;
    if (c._pos==='DEF' && defOnce.length<5) { defOnce.push(c); huecos--; }
    else if (c._pos==='MED' && medOnce.length<4) { medOnce.push(c); huecos--; }
    else if (c._pos==='DEL' && delOnce.length<3) { delOnce.push(c); huecos--; }
  }
  const totalPuntos = [...portero,...defOnce,...medOnce,...delOnce].reduce((acc,j)=>acc+j.puntos,0);
  if (!totalPuntos) { container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);font-family:var(--font-display);font-size:16px">Aún no tenemos el once de la jornada</div>'; return; }
  const filas = [{ label:'🧤 PORTERO',jugadores:portero },{ label:'🛑 DEFENSAS',jugadores:defOnce },{ label:'🧠 MEDIOS',jugadores:medOnce },{ label:'⚽ DELANTEROS',jugadores:delOnce }];
  container.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--neon);letter-spacing:2px">Formación: ' + defOnce.length + '-' + medOnce.length + '-' + delOnce.length + '</div><div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">TOTAL: <strong style="color:var(--neon)">' + totalPuntos + ' pts</strong></div></div>' +
    filas.map(fila => '<div style="margin-bottom:18px"><div style="font-family:var(--font-display);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);padding-bottom:5px;margin-bottom:8px">' + fila.label + '</div>' +
      fila.jugadores.map(j => '<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">' + (j.escudo_url ? '<img loading="lazy" src="' + j.escudo_url + '" width="26" height="26" style="object-fit:contain">' : '<div style="width:26px;height:26px;background:var(--surface);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:9px">' + j.club + '</div>') + '<div style="flex:1"><div style="font-family:var(--font-display);font-weight:600;font-size:14px;color:var(--text)">' + j.nombre + '</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">' + j.club + ' · ' + j.posicion + '</div></div><div style="font-family:var(--font-display);font-weight:700;font-size:20px;color:var(--neon)">' + j.puntos + '</div></div>').join('') + '</div>').join('');
}

/* ── 18. ARRANQUE ────────────────────────────────────────── */
(async function init() {
  document.getElementById('bottom-nav').style.display = 'none';
  await loadConfig();
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    updateNavUser(currentUser);
    document.getElementById('bottom-nav').style.display = 'flex';
    const { data: equipoData } = await db.from('equipos')
      .select('nombre_equipo, equipo_favorito')
      .eq('user_id', currentUser.id).single();
    if (!equipoData?.nombre_equipo) {
      document.getElementById('modal-nombre-equipo').classList.add('open');
    } else {
      goTo('home');
    }
  }
})();