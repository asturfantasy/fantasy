/* ============================================================
   js/app.js  —  Lógica completa de FantasiLiga
   ============================================================ */

/* ── 1. UTILIDADES ───────────────────────────────────────── */

let currentUser = null;
let cambiosSinGuardar = false;

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#b03020' : '#1a1a16';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function abrirConsultaPuntos() {
  const modal = document.getElementById('modal-puntos-jornada');
  const select = document.getElementById('puntos-equipo-select');
  const content = document.getElementById('puntos-jornada-content');
  const titulo = document.getElementById('puntos-jornada-titulo');

  titulo.textContent = `Puntos Jornada ${JORNADA_VISIBLE}`;
  content.innerHTML = '';
  select.value = '';
  modal.classList.add('open');

  // Rellenar equipos
  const clubes = [...new Set(PARTIDOS.flatMap(p => [p.local.abrev, p.visitante.abrev]))];
  select.innerHTML = '<option value="">— Selecciona un equipo —</option>' +
    clubes.map(c => `<option value="${c}">${c}</option>`).join('');

  select.onchange = async () => {
    const club = select.value;
    if (!club) { content.innerHTML = ''; return; }

    content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Cargando...</div>';

    const { data, error } = await db
      .from('jugadores')
      .select('nombre, posicion, total_jornada, foto_url, escudo_url, titular, puerta_cero, lne, gol, asistencia, penalti, gol_pp, amarilla, doble_amarilla, roja, puntos_entrenador')
      .eq('club', club)
      .eq('jornada', JORNADA_VISIBLE)
      .order('total_jornada', { ascending: false });

    if (error || !data?.length) {
      content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin datos</div>';
      return;
    }

    const ordenPos = ['POR','DEF','MED','DEL','ENT'];
    const sorted = [...data].sort((a,b) => ordenPos.indexOf(a.posicion) - ordenPos.indexOf(b.posicion));

    content.innerHTML = sorted.map(j => `
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0;
                  border-bottom:1px solid var(--border);cursor:pointer"
           onclick="mostrarDesglose(${JSON.stringify(j).replace(/"/g, '&quot;')})">
        <div style="position:relative;width:36px;height:36px;flex-shrink:0">
          ${j.foto_url
            ? `<img src="${j.foto_url}" width="36" height="36"
                   style="object-fit:cover;border-radius:50%;border:1px solid var(--border)"
                   onerror="this.style.display='none'">`
            : `<div style="width:36px;height:36px;border-radius:50%;background:var(--surface);
                           display:flex;align-items:center;justify-content:center;
                           font-family:var(--font-display);font-size:13px;color:var(--text-muted)">
                 ${j.nombre.substring(0,2).toUpperCase()}
               </div>`
          }
          ${j.escudo_url
            ? `<img src="${j.escudo_url}" width="14" height="14"
                   style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;
                          border-radius:50%;background:white;border:1px solid rgba(0,0,0,0.2)">`
            : ''}
        </div>
        <div style="flex:1">
          <div style="font-family:var(--font-display);font-weight:600;font-size:14px;color:var(--text)">${j.nombre}</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">${j.posicion}</div>
        </div>
        <div style="font-family:var(--font-display);font-weight:700;font-size:20px;color:var(--neon)">${j.total_jornada}</div>
      </div>
    `).join('');
  };
}

document.getElementById('puntos-jornada-close')?.addEventListener('click', () => {
  document.getElementById('modal-puntos-jornada').classList.remove('open');
});
document.getElementById('modal-puntos-jornada')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

function actualizarPresupuesto() {
  const gastado = Object.values(seleccionados)
    .reduce((acc, j) => acc + (j.valor || 0), 0);
  const disponible = PRESUPUESTO - gastado;
  const el = document.getElementById('presupuesto-valor');
  if (el) {
    el.textContent = disponible.toFixed(1) + 'M';
    el.style.color = disponible < 0 ? 'var(--red)' : disponible < 10 ? 'var(--amber)' : 'var(--neon)';
  }
}

function jornadadCerrada() {
  return new Date() > new Date(DEADLINE_JORNADA);
}

async function mostrarHistorial(nombre, club, posicion) {
  const modal = document.getElementById('modal-historial');
  const content = document.getElementById('historial-content');
  const titulo = document.getElementById('historial-titulo');

  titulo.textContent = nombre;
  content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Cargando...</div>';
  modal.classList.add('open');

  const { data, error } = await db
    .from('jugadores')
    .select('jornada, total_jornada, escudo_url, foto_url, rival, es_local')
    .eq('nombre', nombre)
    .eq('club', club)
    .order('jornada', { ascending: true });

  if (error || !data?.length) {
    content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin datos</div>';
    return;
  }

  const maxPts = Math.max(...data.map(d => d.total_jornada), 1);
  const total = data.reduce((acc, d) => acc + d.total_jornada, 0);
  const escudo = data[0]?.escudo_url || '';
  const foto = data[0]?.foto_url || '';

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;
                padding-bottom:16px;border-bottom:1px solid var(--border)">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--surface);
                  border:2px solid var(--border);display:flex;align-items:center;
                  justify-content:center;font-family:var(--font-display);font-size:22px;
                  color:var(--text-muted);flex-shrink:0;position:relative">
        ${foto ? `<img src="${foto}" width="64" height="64" style="object-fit:cover;border-radius:50%">` : nombre.substring(0,2).toUpperCase()}
        ${escudo ? `<img src="${escudo}" width="20" height="20"
                        style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;
                               border-radius:50%;background:var(--bg2);border:1px solid var(--border)">` : ''}
      </div>
      <div>
        <div style="font-family:var(--font-display);font-weight:700;font-size:20px;color:var(--text)">${nombre}</div>
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${posicion}</div>
      </div>
    </div>
    <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);
                text-align:right;margin-bottom:16px;letter-spacing:1px">
      TOTAL ACUMULADO: <strong style="color:var(--neon)">${total} pts</strong>
    </div>
    ${data.map(d => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;min-width:80px">
          <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">J${d.jornada}</span>
          ${d.rival ? `
            <span style="font-size:10px">${d.es_local ? '🏠' : '✈️'}</span>
            <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">${d.rival}</span>
          ` : ''}
        </div>
        <div style="flex:1;background:var(--surface);border-radius:4px;height:24px;overflow:hidden">
          <div style="height:100%;width:${Math.max((d.total_jornada / maxPts) * 100, 0)}%;
                      background:var(--neon);border-radius:4px;
                      display:flex;align-items:center;justify-content:flex-end;
                      padding-right:6px;transition:width 0.3s;min-width:${d.total_jornada > 0 ? '24px' : '0'}">
            ${d.total_jornada > 0 ? `<span style="font-family:var(--font-display);font-size:12px;color:${d.total_jornada > 0 ? 'var(--bg)' : 'transparent'};font-weight:700">${d.total_jornada}</span>` : ''}
          </div>
        </div>
        ${d.total_jornada <= 0 ? `<span style="font-family:var(--font-display);font-size:12px;color:var(--text-muted)">0</span>` : ''}
      </div>
    `).join('')}
  `;
}

async function mostrarPartido(localAbrev, visitanteAbrev, localNombre, visitanteNombre) {
  const modal = document.getElementById('modal-partido');
  const content = document.getElementById('partido-content');
  const titulo = document.getElementById('partido-titulo');

  const resultadoPartido = PARTIDOS.find(p => p.local.abrev === localAbrev);
  const marcador = resultadoPartido?.resultado?.finalizado
    ? ` ${resultadoPartido.resultado.local} - ${resultadoPartido.resultado.visitante}`
    : '';
  titulo.textContent = `${localNombre}${marcador} ${visitanteNombre}`;
  content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Cargando...</div>';
  modal.classList.add('open');

  const { data, error } = await db
      .from('jugadores')
      .select('nombre, club, posicion, total_jornada, escudo_url, foto_url, titular, puerta_cero, lne, gol, asistencia, penalti, gol_pp, amarilla, doble_amarilla, roja, puntos_entrenador')
      .in('club', [localAbrev, visitanteAbrev])
      .eq('jornada', JORNADA_ACTIVA)
      .order('total_jornada', { ascending: false });

  if (error || !data?.length) {
    content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin datos</div>';
    return;
  }

  const desglose = (j) => {
    const items = [];
    if (j.titular)        items.push({ label: 'Titular', pts: 1 });
    if (j.puerta_cero && j.titular) {
      const pc = j.posicion === 'POR' ? 3 : j.posicion === 'DEF' ? 2 : j.posicion === 'MED' ? 1 : 0;
      if (pc) items.push({ label: 'Portería a cero', pts: pc });
    }
    if (j.lne === 1) items.push({ label: 'Nota LNE: 1', pts: 2 });
    if (j.lne === 2) items.push({ label: 'Nota LNE: 2', pts: 6 });
    if (j.lne === 3) items.push({ label: 'Nota LNE: 3', pts: 10 });
    if (j.gol) {
      const ptg = j.posicion === 'POR' ? 6 : j.posicion === 'DEF' ? 5 : j.posicion === 'MED' ? 4 : 3;
      items.push({ label: `Gol${j.gol > 1 ? 'es (' + j.gol + ')' : ''}`, pts: j.gol * ptg });
    }
    if (j.asistencia)     items.push({ label: `Asistencia${j.asistencia > 1 ? 's (' + j.asistencia + ')' : ''}`, pts: j.asistencia });
    if (j.penalti)        items.push({ label: 'Penalti', pts: j.penalti * 3 });
    if (j.gol_pp)         items.push({ label: 'Gol PP', pts: j.gol_pp * -2 });
    if (j.amarilla)       items.push({ label: 'Amarilla', pts: j.amarilla * -1 });
    if (j.doble_amarilla) items.push({ label: 'Doble amarilla', pts: j.doble_amarilla * -3 });
    if (j.roja)           items.push({ label: 'Roja directa', pts: j.roja * -5 });
    return items;
  };

  const ordenPos = ['POR','DEF','MED','DEL','ENT'];
  const local = data
    .filter(j => j.club === localAbrev)
    .sort((a,b) => ordenPos.indexOf(a.posicion) - ordenPos.indexOf(b.posicion));
  const visitante = data
    .filter(j => j.club === visitanteAbrev)
    .sort((a,b) => ordenPos.indexOf(a.posicion) - ordenPos.indexOf(b.posicion));

const renderJugador = (j, alineacion = 'left') => `
  <div style="display:flex;align-items:center;gap:8px;padding:6px 0;
              border-bottom:1px solid var(--border);cursor:pointer;
              flex-direction:${alineacion === 'right' ? 'row-reverse' : 'row'}"
       onclick="mostrarDesglose(${JSON.stringify(j).replace(/"/g, '&quot;')})">
    <div style="position:relative;width:32px;height:32px;flex-shrink:0">
        ${j.foto_url
          ? `<img src="${j.foto_url}" width="32" height="32"
               style="object-fit:cover;border-radius:50%;border:1px solid var(--border)"
               onerror="this.style.display='none'">`
          : `<div style="width:32px;height:32px;border-radius:50%;background:var(--surface);
                         display:flex;align-items:center;justify-content:center;
                         font-family:var(--font-display);font-size:11px;color:var(--text-muted)">
               ${j.nombre.substring(0,2).toUpperCase()}
             </div>`
        }
        ${j.escudo_url
          ? `<img src="${j.escudo_url}" width="12" height="12"
               style="position:absolute;bottom:-1px;right:-1px;object-fit:contain;
                      border-radius:50%;background:white;border:1px solid rgba(0,0,0,0.2)">`
          : ''}
      </div>
      <div style="flex:1;min-width:0;text-align:${alineacion === 'right' ? 'right' : 'left'}">
        <div style="font-family:var(--font-display);font-weight:600;font-size:13px;
                    color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${j.nombre}
        </div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">${j.posicion}</div>
      </div>
      <div style="font-family:var(--font-display);font-weight:700;font-size:16px;
                  color:var(--neon);flex-shrink:0">${j.total_jornada}</div>
    </div>
  `;

  const totalLocal = local.reduce((acc, j) => acc + (j.total_jornada || 0), 0);
  const totalVisitante = visitante.reduce((acc, j) => acc + (j.total_jornada || 0), 0);

  content.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;
                max-height:60vh;overflow-y:auto;padding-right:4px">
      <div>
        <div style="font-family:var(--font-display);font-weight:700;font-size:14px;
                    color:var(--text);text-align:center;margin-bottom:10px;
                    padding-bottom:8px;border-bottom:2px solid var(--neon);
                    position:sticky;top:0;background:var(--bg2);z-index:1">
          ${localNombre} <span style="color:var(--neon)">(${totalLocal})</span>
        </div>
        ${local.map(j => renderJugador(j, 'left')).join('')}
      </div>
      <div>
        <div style="font-family:var(--font-display);font-weight:700;font-size:14px;
                    color:var(--text);text-align:center;margin-bottom:10px;
                    padding-bottom:8px;border-bottom:2px solid var(--neon);
                    position:sticky;top:0;background:var(--bg2);z-index:1">
          ${visitanteNombre} <span style="color:var(--neon)">(${totalVisitante})</span>
        </div>
        ${visitante.map(j => renderJugador(j, 'right')).join('')}
      </div>
    </div>
  `;
}

document.getElementById('partido-close')?.addEventListener('click', () => {
  document.getElementById('modal-partido').classList.remove('open');
});
document.getElementById('modal-partido')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

function desgloseFn(j) {
  const items = [];

  // Entrenador solo tiene puntos_entrenador
    if (j.posicion === 'ENT') {
      items.push({ label: 'Puntos entrenador', pts: j.puntos_entrenador || 0 });
      return items;
    }

  const pcPts = j.posicion === 'POR' ? 3 : j.posicion === 'DEF' ? 2 : j.posicion === 'MED' ? 1 : 0;
  const golPts = j.posicion === 'POR' ? 6 : j.posicion === 'DEF' ? 5 : j.posicion === 'MED' ? 4 : 3;
  const lnePts = j.lne === 1 ? 2 : j.lne === 2 ? 6 : j.lne === 3 ? 10 : 0;

  items.push({ label: 'Titular', pts: j.titular ? 1 : 0 });
  if (pcPts > 0) items.push({ label: 'Portería a cero', pts: (j.puerta_cero && j.titular) ? pcPts : 0 });
  items.push({ label: `Nota LNE (${j.lne || 0})`, pts: lnePts });
  items.push({ label: `Goles (${j.gol || 0})`, pts: (j.gol || 0) * golPts });
  items.push({ label: `Asistencias (${j.asistencia || 0})`, pts: j.asistencia || 0 });
  items.push({ label: `Penaltis (${j.penalti || 0})`, pts: (j.penalti || 0) * 3 });
  items.push({ label: `Gol PP (${j.gol_pp || 0})`, pts: (j.gol_pp || 0) * -2 });
  items.push({ label: `Amarillas (${j.amarilla || 0})`, pts: (j.amarilla || 0) * -1 });
  items.push({ label: `Doble amarilla (${j.doble_amarilla || 0})`, pts: (j.doble_amarilla || 0) * -3 });
  items.push({ label: `Roja directa (${j.roja || 0})`, pts: (j.roja || 0) * -5 });
  return items;
}

function mostrarDesglose(j) {
  const modal = document.getElementById('modal-desglose');
  const content = document.getElementById('desglose-content');
  document.getElementById('desglose-titulo').textContent = j.nombre;

  const items = desgloseFn(j);

  content.innerHTML = items.length ? `
    ${items.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;
                  padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-family:var(--font-body);font-size:13px;color:var(--text-muted)">${item.label}</span>
        <span style="font-family:var(--font-display);font-weight:700;font-size:16px;
                     color:${item.pts >= 0 ? 'var(--neon)' : 'var(--red)'}">
          ${item.pts > 0 ? '+' : ''}${item.pts}
        </span>
      </div>
    `).join('')}
    <div style="display:flex;justify-content:space-between;align-items:center;
                padding:10px 0;margin-top:4px">
      <span style="font-family:var(--font-display);font-weight:700;font-size:14px;
                   text-transform:uppercase;letter-spacing:1px;color:var(--text)">Total</span>
      <span style="font-family:var(--font-display);font-weight:700;font-size:24px;
                   color:var(--neon)">${j.total_jornada}</span>
    </div>
  ` : `<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin puntuación esta jornada</div>`;

  modal.classList.add('open');
}

document.getElementById('desglose-close')?.addEventListener('click', () => {
  document.getElementById('modal-desglose').classList.remove('open');
});
document.getElementById('modal-desglose')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

function toggleUserMenu() {
  const menus = ['user-menu', 'user-menu-lineup', 'user-menu-myteam', 'user-menu-ranking', 'user-menu-criterios'];
  const screenActiva = document.querySelector('.screen.active');
  const menuId = screenActiva?.id === 'screen-home'      ? 'user-menu' :
                 screenActiva?.id === 'screen-lineup'    ? 'user-menu-lineup' :
                 screenActiva?.id === 'screen-myteam'    ? 'user-menu-myteam' :
                 screenActiva?.id === 'screen-ranking'   ? 'user-menu-ranking' :
                 screenActiva?.id === 'screen-criterios' ? 'user-menu-criterios' : 'user-menu';

  menus.forEach(id => {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
  });

  const menu = document.getElementById(menuId);
  if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function toggleTheme() {
  const link = document.querySelector('link[rel="stylesheet"][href*="style"]');
  const esDark = link.href.includes('style-moderno');
  link.href = esDark ? 'css/style-claro.css' : 'css/style-moderno.css';
  const btn = document.getElementById('btn-toggle-theme');
  if (btn) btn.textContent = esDark ? 'Modo oscuro' : 'Modo claro';
  localStorage.setItem('theme', esDark ? 'claro' : 'oscuro');
}

// Recordar tema al cargar
const temaGuardado = localStorage.getItem('theme');
if (temaGuardado === 'claro') {
  document.querySelector('link[rel="stylesheet"][href*="style"]').href = 'css/style-claro.css';
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-toggle-theme');
    if (btn) btn.textContent = 'Modo oscuro';
  });
}

document.getElementById('btn-toggle-theme')?.addEventListener('click', toggleTheme);

// Cerrar el menú al hacer clic fuera
document.addEventListener('click', e => {
  if (!e.target.closest('.nav-user')) {
    ['user-menu', 'user-menu-lineup', 'user-menu-myteam', 'user-menu-ranking'].forEach(id => {
      const m = document.getElementById(id);
      if (m) m.style.display = 'none';
    });
  }
});

function goTo(screenId) {
  const screenActiva = document.querySelector('.screen.active');
  if (cambiosSinGuardar && screenActiva?.id === 'screen-lineup' && screenId !== 'lineup') {
    const confirmar = confirm('⚠️ No has guardado los cambios. ¿Seguro que quieres salir?');
    if (!confirmar) return;
    cambiosSinGuardar = false;
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + screenId);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
  const loaders = { home: loadHome, lineup: loadLineup, myteam: loadMyTeam, ranking: loadRanking, criterios: () => {} };
  if (loaders[screenId]) loaders[screenId]();
}

function updateNavUser(user) {
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  ['', '-lineup', '-myteam', '-ranking', '-criterios'].forEach(s => {
    const av = document.getElementById('nav-avatar' + s);
    const un = document.getElementById('nav-username' + s);
    const mn = document.getElementById('user-menu-name' + (s || ''));
    if (av) av.textContent = initials;
    if (un) un.textContent = name.split(' ')[0];
    if (mn) mn.textContent = '¡Bienvenido, ' + name.split(' ')[0] + '!';
  });
}

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-target]');
  if (btn) goTo(btn.dataset.target);
});


/* ── 2. AUTENTICACIÓN ────────────────────────────────────── */

async function loginWithGoogle() {
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) showToast('Error al iniciar sesión: ' + error.message, true);
}

async function logout() {
  await db.auth.signOut();
  currentUser = null;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-login').classList.add('active');
}

document.getElementById('btn-google-login').addEventListener('click', loginWithGoogle);
document.querySelectorAll('[data-logout]').forEach(btn => btn.addEventListener('click', logout));
document.getElementById('btn-logout')?.addEventListener('click', logout);

db.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    currentUser = session.user;
    updateNavUser(currentUser);
    if (event === 'SIGNED_IN') goTo('home');
  } else {
    currentUser = null;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-login').classList.add('active');
  }
});


/* ── 3. HOME ─────────────────────────────────────────────── */

function loadHome() {
  document.getElementById('home-jornada-num').textContent = JORNADA_ACTIVA;

  const userName = currentUser?.user_metadata?.full_name?.split(' ')[0] || 'crack';
  const bienvenida = document.getElementById('home-bienvenida');
  if (bienvenida) bienvenida.textContent = '¡Bienvenido, ' + userName + '!';

  const btnJ = document.getElementById('btn-jornada-visible');
  if (btnJ) btnJ.textContent = JORNADA_VISIBLE;

  const container = document.getElementById('matches-container');
  container.innerHTML = PARTIDOS.map(p => `
    <div class="match-card">
      <div class="match-team">
        <div class="crest" style="background:${p.local.color};color:white;display:flex;align-items:center;justify-content:center">
          ${p.local.escudo_url
            ? `<img src="${p.local.escudo_url}" alt="${p.local.abrev}" width="48" height="48" style="object-fit:contain" onerror="this.outerHTML='${p.local.abrev}'">`
            : p.local.abrev}
        </div>
        <div>
          <div class="team-name">${p.local.nombre}</div>
          <div class="match-date"></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;padding:0 4px;min-width:100px;max-width:120px">
        ${p.resultado?.finalizado ? `
          <div style="font-family:var(--font-display);font-size:18px;font-weight:700;
                      color:var(--text);letter-spacing:2px">
            ${p.resultado.local} - ${p.resultado.visitante}
          </div>
          <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:2px;
                      color:var(--neon);text-transform:uppercase;margin-bottom:2px">Final</div>
        ` : `
          <div class="match-vs">${p.estadio}</div>
          <div class="match-date">${p.fecha}</div>
        `}
        ${p.resultado?.finalizado ? `
          <button onclick="mostrarPartido('${p.local.abrev}', '${p.visitante.abrev}', '${p.local.nombre}', '${p.visitante.nombre}')"
            style="background:var(--neon);color:var(--bg);border:none;border-radius:20px;
                   padding:6px 14px;cursor:pointer;font-family:var(--font-display);
                   font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;
                   margin-top:6px;transition:all 0.2s;box-shadow:0 2px 8px var(--neon-glow);width:100%"
            onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px var(--neon-glow)'"
            onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px var(--neon-glow)'">
            Consultar puntos
          </button>
        ` : ''}
      </div>
      <div class="match-team right">
        <div class="crest" style="background:${p.visitante.color};color:white;display:flex;align-items:center;justify-content:center">
          ${p.visitante.escudo_url
            ? `<img src="${p.visitante.escudo_url}" alt="${p.visitante.abrev}" width="48" height="48" style="object-fit:contain" onerror="this.outerHTML='${p.visitante.abrev}'">`
            : p.visitante.abrev}
        </div>
        <div style="text-align:right">
          <div class="team-name">${p.visitante.nombre}</div>
          <div class="match-date"></div>
        </div>
      </div>
    </div>
  `).join('');
}


/* ── 4. ALINEACIÓN ───────────────────────────────────────── */

const FORMACIONES = {
  '4-3-3': { def:4, mid:3, fwd:3 },
  '4-4-2': { def:4, mid:4, fwd:2 },
  '4-5-1': { def:4, mid:5, fwd:1 },
  '3-4-3': { def:3, mid:4, fwd:3 },
  '3-5-2': { def:3, mid:5, fwd:2 },
  '5-3-2': { def:5, mid:3, fwd:2 },
};

let seleccionados = {};
let jugadoresPorPos = { POR:[], DEF:[], MED:[], DEL:[], ENT:[] };
let capitan = null;

// Actualiza el select de capitán con los jugadores seleccionados
function actualizarSelectCapitan() {
  const sel = document.getElementById('capitan-select');
  if (!sel) return;
  const valorActual = sel.value;
  sel.innerHTML = '<option value="">Elige bien, será determinante</option>';
  Object.values(seleccionados).forEach(j => {
    if (j.posicion === 'ENT') return; // el entrenador no puede ser capitán
    const opt = document.createElement('option');
    opt.value = j.id;
    opt.textContent = j.nombre + ' · ' + j.posicion;
    sel.appendChild(opt);
  });
  // Mantener el capitán si sigue en el equipo
  if ([...sel.options].some(o => o.value === valorActual)) {
    sel.value = valorActual;
    capitan = valorActual || null;
  } else {
    capitan = null;
  }
}

async function loadLineup() {
  document.getElementById('lineup-jornada').textContent = JORNADA_ACTIVA;
  cambiosSinGuardar = false;
    const deadlineEl = document.getElementById('deadline-info');
    if (deadlineEl) {
      const fecha = new Date(DEADLINE_JORNADA);
      const opciones = { weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' };
      const fechaFormateada = fecha.toLocaleDateString('es-ES', opciones);

      if (jornadadCerrada()) {
        deadlineEl.innerHTML = `<span class="deadline-cerrado">La jornada comenzó el ${fechaFormateada}</span>`;
      } else {
        deadlineEl.innerHTML = `
          <span class="deadline-abierto">🏁 Podrás hacer tu once hasta el ${fechaFormateada}h</span>
          <span class="deadline-abierto-card" style="margin-top:8px" id="countdown-box">
                      <span id="countdown-timer">Calculando...</span>
                    </span>
          </span>
        `;

        // Cuenta atrás
        const actualizarCuenta = () => {
          const ahora = new Date();
          const diff = new Date(DEADLINE_JORNADA) - ahora;

          if (diff <= 0) {
            document.getElementById('countdown-timer').textContent = '¡Plazo cerrado!';
            clearInterval(intervalo);
            return;
          }

          const dias    = Math.floor(diff / (1000 * 60 * 60 * 24));
          const horas   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const segundos = Math.floor((diff % (1000 * 60)) / 1000);

          const partes = [];
          if (dias > 0)    partes.push(`${dias}d`);
          if (horas > 0)   partes.push(`${horas}h`);
          if (minutos > 0) partes.push(`${minutos}m`);
          partes.push(`${segundos}s`);

          document.getElementById('countdown-timer').textContent =
            `⏳ Quedan ${partes.join(' ')} para el cierre de la jornada`;
        };

        actualizarCuenta();
        const intervalo = setInterval(actualizarCuenta, 1000);
      }
    }
    // Comprobar deadline
   if (jornadadCerrada()) {
     const pitch = document.getElementById('pitch');
     pitch.querySelectorAll('.pitch-row').forEach(r => r.remove());
     pitch.innerHTML = `
       <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                   height:300px;gap:16px;position:relative;z-index:1">
         <div style="font-size:48px">🔒</div>
         <div style="font-family:var(--font-display);font-size:28px;font-weight:700;
                     color:white;letter-spacing:2px;text-align:center">
           JORNADA CERRADA
         </div>
         <div style="font-family:var(--font-mono);font-size:12px;color:rgba(255,255,255,0.6);
                     text-align:center;letter-spacing:1px">
           La J${JORNADA_ACTIVA} ya ha empezado<br>Es tarde para modificar tu alineación
         </div>
       </div>
     `;
     document.getElementById('btn-save-lineup').style.display = 'none';
     document.getElementById('btn-clear-lineup').style.display = 'none';
     document.getElementById('btn-export-png').style.display = 'none';
     const capitanWrapper = document.getElementById('capitan-wrapper');
     if (capitanWrapper) capitanWrapper.style.display = 'none';
     const btnConsultar = document.getElementById('btn-consultar-equipo');
     if (btnConsultar) btnConsultar.style.display = 'block';
     return;
   }
   // Restaurar botones y selector por si venía de jornada cerrada
     document.getElementById('btn-save-lineup').style.display = '';
     document.getElementById('btn-clear-lineup').style.display = '';
     document.getElementById('btn-export-png').style.display = '';
     const capitanWrapper = document.getElementById('capitan-wrapper');
     if (capitanWrapper) capitanWrapper.style.display = '';
     const btnConsultar = document.getElementById('btn-consultar-equipo');
     if (btnConsultar) btnConsultar.style.display = 'none';

  seleccionados = {};
  capitan = null;
  const sel = document.getElementById('capitan-select');
  if (sel) sel.innerHTML = '<option value="">— Elige tu capitán —</option>';

  const { data, error } = await db
    .from('jugadores')
    .select('*')
    .eq('jornada', JORNADA_ACTIVA)
    .eq('activo', 1)
    .order('puntos', { ascending: false });

  if (error) { showToast('Error cargando jugadores', true); return; }

  // Cargar puntos totales de cada jugador
  const { data: rankingData } = await db
    .from('ranking_jugadores')
    .select('nombre, club, puntos_total');

  const puntosMap = {};
  (rankingData || []).forEach(r => {
    puntosMap[`${r.nombre}-${r.club}`] = r.puntos_total;
  });

  // Añadir puntos_total a cada jugador
  (data || []).forEach(j => {
    j.puntos_total = puntosMap[`${j.nombre}-${j.club}`] ?? j.puntos;
  });

  jugadoresPorPos = { POR:[], DEF:[], MED:[], DEL:[], ENT:[] };
  (data || []).forEach(j => {
    if (jugadoresPorPos[j.posicion]) jugadoresPorPos[j.posicion].push(j);
  });
  Object.keys(jugadoresPorPos).forEach(pos => {
    jugadoresPorPos[pos].sort((a, b) => (b.puntos_total ?? 0) - (a.puntos_total ?? 0));
  });

  if (currentUser) {
    const { data: equipoGuardado } = await db
      .from('mi_equipo')
      .select('jugador_id, formacion, capitan')
      .eq('user_id', currentUser.id)
      .eq('jornada', JORNADA_ACTIVA);

    if (equipoGuardado?.length) {
      const formacion = equipoGuardado[0].formacion;
      document.getElementById('formation-select').value = formacion;

      const contadores = { POR:0, DEF:0, MED:0, DEL:0, ENT:0 };
      const idsGuardados = equipoGuardado.map(e => e.jugador_id);
      const jugadoresGuardados = data.filter(j => idsGuardados.includes(j.id));

      const ordenPos = ['POR','DEF','MED','DEL','ENT'];
      jugadoresGuardados
        .sort((a,b) => ordenPos.indexOf(a.posicion) - ordenPos.indexOf(b.posicion))
        .forEach(j => {
          const slotId = `${j.posicion}-${contadores[j.posicion]}`;
          seleccionados[slotId] = j;
          contadores[j.posicion]++;
        });

      const capGuardado = equipoGuardado.find(e => e.capitan === true || e.capitan === 1);
      const capitanIdGuardado = capGuardado ? capGuardado.jugador_id : null;

      actualizarSelectCapitan();

      if (capitanIdGuardado) {
        document.getElementById('capitan-select').value = capitanIdGuardado;
      }

      capitan = capitanIdGuardado;
      //showToast();
    }
  }

  setTimeout(() => {
    renderPitch();
    actualizarPresupuesto();
  }, 100);
}

async function exportarAlineacion() {
  const { data: equipoData } = await db
    .from('equipos')
    .select('nombre_equipo')
    .eq('user_id', currentUser.id)
    .single();
  const nombreEquipo = equipoData?.nombre_equipo || 'Mi Equipo';

  const formacion = document.getElementById('formation-select')?.value || '—';
  document.getElementById('export-nombre-equipo').textContent = nombreEquipo;
  document.getElementById('export-formacion').textContent = formacion;
  document.getElementById('export-jornada').textContent = JORNADA_ACTIVA;

  const area = document.getElementById('export-area');
  const header = document.getElementById('export-header');
  area.style.display = 'block';
  header.style.display = 'flex';

  const canvas = await html2canvas(area, {
    useCORS: true,
    allowTaint: true,
    scale: 2,
    backgroundColor: '#ffffff'
  });

  area.style.display = '';
  header.style.display = 'none';

  if (canvas.width === 0 || canvas.height === 0) {
    showToast('Error al generar la imagen', true);
    return;
  }

  const link = document.createElement('a');
  link.download = `asturfantasy-j${JORNADA_ACTIVA}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function renderPitch() {
  const formacion = document.getElementById('formation-select').value;
  const { def, mid, fwd } = FORMACIONES[formacion];
  const pitch = document.getElementById('pitch');

  pitch.querySelectorAll('.pitch-row').forEach(r => r.remove());

  const stripes = document.getElementById('pitch-stripes');
  stripes.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const d = document.createElement('div');
    d.className = 'pitch-stripe';
    stripes.appendChild(d);
  }

  const filas = [
    { pos:'DEL', count:fwd, cls:'fwd' },
    { pos:'MED', count:mid, cls:'mid' },
    { pos:'DEF', count:def, cls:'def' },
    { pos:'POR', count:1,  cls:'gk'  },
    { pos:'ENT', count:1,  cls:'ent' },
  ];

  filas.forEach(fila => {
    const row = document.createElement('div');
    row.className = 'pitch-row';

    for (let i = 0; i < fila.count; i++) {
      const slotId = `${fila.pos}-${i}`;
      const jugador = seleccionados[slotId];
      const slot = document.createElement('div');
      slot.className = 'player-slot';
      slot.dataset.slot = slotId;

      if (jugador) {
        const esCap = capitan !== null && String(capitan) === String(jugador.id);
        const circuloContenido = jugador.foto_url
          ? `<img src="${jugador.foto_url}" alt="${jugador.nombre}"
               width="46" height="46" style="object-fit:cover;border-radius:50%"
               onerror="this.style.display='none'">`
          : jugador.nombre.substring(0,3).toUpperCase();

        const escudoCirculo = jugador.escudo_url
          ? `<img src="${jugador.escudo_url}" alt="${jugador.club}" width="16" height="16"
               style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;
                      border-radius:50%;background:white;border:1px solid rgba(0,0,0,0.2)">`
          : '';

        slot.innerHTML = `
          <div class="player-circle ${fila.cls} ${esCap ? 'es-capitan' : ''}" style="overflow:visible;position:relative">
            ${circuloContenido}
            ${escudoCirculo}
            ${esCap ? '<span class="cap-badge">C</span>' : ''}
          </div>
          <div class="player-name">${jugador.nombre}</div>
          <div class="pos-badge">${esCap ? '⭐ Cap.' : jugador.club}</div>`;
      } else {
        slot.innerHTML = `
          <div class="player-circle ${fila.cls} empty">+</div>
          <div class="player-name" style="color:rgba(255,255,255,.4)">${fila.pos}</div>
          <div class="pos-badge">–</div>`;
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

  const colores    = { gk:'var(--amber)', def:'var(--blue)', mid:'var(--ink)', fwd:'var(--red)', ent:'black' };
  const textoCols  = { gk:'var(--ink)',   def:'white',       mid:'var(--cream)', fwd:'white',    ent:'white' };

  list.innerHTML = `
    <div style="padding:12px 20px;border-bottom:1px solid var(--cream-dark);position:sticky;top:0;background:var(--cream);z-index:1">
      <input id="modal-search" type="text" placeholder="Buscar jugador..."
        style="width:100%;padding:8px 12px;font-family:var(--font-mono);font-size:13px;
               border:2px solid var(--ink);border-radius:4px;background:var(--white);color:var(--ink);margin-bottom:8px">
      <button id="btn-vaciar-posicion"
        style="width:100%;padding:8px;background:#8b6914;color:white;border:none;border-radius:4px;
               font-family:var(--font-display);font-weight:700;font-size:13px;letter-spacing:1px;
               text-transform:uppercase;cursor:pointer;">
        🗑 Vaciar posición
      </button>
    </div>
    <div id="modal-players"></div>
  `;

  document.getElementById('btn-vaciar-posicion').addEventListener('click', () => {
    delete seleccionados[slotId];
    if (capitan === seleccionados[slotId]?.id) capitan = null;
    closeModal();
    renderPitch();
    actualizarSelectCapitan();
  });

  const renderLista = (filtro = '') => {
    const filtrados = jugadoresPorPos[posicion].filter(j =>
      j.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      j.club.toLowerCase().includes(filtro.toLowerCase())
    );

    document.getElementById('modal-players').innerHTML = filtrados.map(j => {
      const usado = usados.has(j.id);

      const escudo = `
        <div style="position:relative;width:36px;height:36px;flex-shrink:0">
          ${j.foto_url
            ? `<img src="${j.foto_url}" width="36" height="36"
                     style="object-fit:cover;border-radius:50%;border:2px solid var(--border)"
                     onerror="this.style.display='none'">`
            : `<div style="width:36px;height:36px;border-radius:50%;
                           background:${colores[cls]};color:${textoCols[cls]};
                           display:flex;align-items:center;justify-content:center;
                           font-family:var(--font-display);font-size:13px">
                 ${j.nombre.substring(0,2).toUpperCase()}
               </div>`
          }
          ${j.escudo_url
            ? `<img src="${j.escudo_url}" width="14" height="14"
                     style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;
                            border-radius:50%;background:white;border:1px solid rgba(0,0,0,0.2)">`
            : ''}
        </div>`;

      return `<div class="modal-player" data-id="${j.id}" data-slot="${slotId}"
                style="opacity:${usado ? 0.35 : 1};pointer-events:${usado ? 'none' : 'auto'}">
        ${escudo}
        <div>
          <div class="modal-player-name">${j.nombre}</div>
          <div class="modal-player-meta">
            ${j.club} · ${j.posicion}
            ${j.rival ? `· vs ${j.rival} (${j.es_local ? '🏠' : '✈️'})` : ''}
          </div>
        </div>
        <div style="text-align:right">
          <div class="modal-player-pts">${posicion === 'ENT' ? (j.puntos_entrenador || 0) : j.puntos_total}</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--amber)">${j.valor || 0}M</div>
        </div>
      </div>`;
    }).join('');

    document.querySelectorAll('.modal-player').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        seleccionados[slotId] = jugadoresPorPos[posicion].find(j => j.id === id);
        cambiosSinGuardar = true;
        closeModal();
        renderPitch();
        actualizarSelectCapitan();
        actualizarPresupuesto();
      });
    });
  };

  renderLista();
  document.getElementById('modal-search').addEventListener('input', e => {
    renderLista(e.target.value);
  });

  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('historial-close')?.addEventListener('click', () => {
  document.getElementById('modal-historial').classList.remove('open');
});
document.getElementById('modal-historial')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

document.getElementById('formation-select').addEventListener('change', () => {
  const formacion = document.getElementById('formation-select').value;
  const { def, mid, fwd } = FORMACIONES[formacion];

  // Limpiar slots que sobren según la nueva formación
  const maxPorPos = { POR:1, DEF:def, MED:mid, DEL:fwd, ENT:1 };

  Object.keys(seleccionados).forEach(slotId => {
    const [pos, idx] = slotId.split('-');
    if (parseInt(idx) >= maxPorPos[pos]) {
      // Si el jugador eliminado era capitán, resetear capitán
      if (capitan === seleccionados[slotId]?.id) {
        capitan = null;
        const sel = document.getElementById('capitan-select');
        if (sel) sel.value = '';
      }
      delete seleccionados[slotId];
    }
  });

  actualizarSelectCapitan();
  renderPitch();
});
// Select de capitán
document.getElementById('capitan-select')?.addEventListener('change', e => {
  if (e.isTrusted) {
    capitan = e.target.value || null;
    cambiosSinGuardar = true;
    renderPitch();
  }
});

// Guardar alineación
// Guardar alineación
document.getElementById('btn-save-lineup').addEventListener('click', async () => {
  if (!currentUser) { showToast('Debes iniciar sesión', true); return; }

  const formacion = document.getElementById('formation-select').value;
  const { def, mid, fwd } = FORMACIONES[formacion];
  const totalSlots = 1 + def + mid + fwd + 1; // +1 portero +1 entrenador

  if (Object.keys(seleccionados).length < totalSlots) {
    showToast('¡Faltan jugadores por seleccionar! Completa tu once', true);
    return;
  }
  const gastado = Object.values(seleccionados).reduce((acc, j) => acc + (j.valor || 0), 0);
  if (gastado > PRESUPUESTO) {
    showToast('Has superado el presupuesto disponible', true);
    return;
  }

  await db.from('mi_equipo').delete()
    .eq('user_id', currentUser.id)
    .eq('jornada', JORNADA_ACTIVA);

  const filas = Object.values(seleccionados).map(jugador => ({
    user_id:    currentUser.id,
    jugador_id: jugador.id,
    jornada:    JORNADA_ACTIVA,
    formacion,
    capitan:    capitan === jugador.id,
  }));

  const { error } = await db.from('mi_equipo').insert(filas);
  if (error) showToast('Error al guardar: ' + error.message, true);
  else {
    cambiosSinGuardar = false;
    showToast('Alineación guardada');
  }
  });

// Vaciar alineación
document.getElementById('btn-clear-lineup').addEventListener('click', async () => {
  if (!currentUser) return;

  const confirmar = confirm('¿Seguro que quieres vaciar tu alineación?');
  if (!confirmar) return;

  await db.from('mi_equipo').delete()
    .eq('user_id', currentUser.id)
    .eq('jornada', JORNADA_ACTIVA);

  seleccionados = {};
  capitan = null;
  const sel = document.getElementById('capitan-select');
  if (sel) sel.innerHTML = '<option value="">— Elige tu capitán —</option>';

  renderPitch();
  showToast('Alineación vaciada ✓');
});


/* ── 5. MI EQUIPO ────────────────────────────────────────── */

const POS_COLORS = { POR:'var(--yellow)', DEF:'var(--blue)', MED:'var(--green)', DEL:'var(--red)', ENT:'black' };
const POS_TEXT   = { POR:'var(--black)',   DEF:'white',       MED:'var(--black)', DEL:'white',    ENT:'white' };

async function mostrarDesgloseMyTeam(jugadorId, nombre, posicion, jornada = JORNADA_VISIBLE) {
  const modal = document.getElementById('modal-desglose');
  const content = document.getElementById('desglose-content');
  document.getElementById('desglose-titulo').textContent = nombre;
  modal.classList.add('open');

  const { data, error } = await db
    .from('jugadores')
    .select('titular, puerta_cero, lne, gol, asistencia, penalti, gol_pp, amarilla, doble_amarilla, roja, total_jornada, puntos_entrenador')
    .eq('id', jugadorId)
    .eq('jornada', jornada)
    .single();

  if (error || !data) {
    content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin datos</div>';
    return;
  }

  const j = { ...data, posicion, nombre };
  const items = desgloseFn(j);

  content.innerHTML = `
    ${items.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;
                  padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-family:var(--font-body);font-size:13px;color:var(--text-muted)">${item.label}</span>
        <span style="font-family:var(--font-display);font-weight:700;font-size:16px;
                     color:${item.pts >= 0 ? 'var(--neon)' : 'var(--red)'}">
          ${item.pts > 0 ? '+' : ''}${item.pts}
        </span>
      </div>
    `).join('')}
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;margin-top:4px">
      <span style="font-family:var(--font-display);font-weight:700;font-size:14px;
                   text-transform:uppercase;letter-spacing:1px;color:var(--text)">Total</span>
      <span style="font-family:var(--font-display);font-weight:700;font-size:24px;
                   color:var(--neon)">${data.total_jornada}</span>
    </div>
  `;
}

async function loadMyTeam() {
  if (!currentUser) return;

  const selectMyTeam = document.getElementById('myteam-jornada-select');
  if (selectMyTeam) {
    selectMyTeam.innerHTML = '';
    for (let i = JORNADA_VISIBLE; i >= 1; i--) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `J${i}`;
      selectMyTeam.appendChild(opt);
    }
    selectMyTeam.value = JORNADA_VISIBLE;
    selectMyTeam.onchange = e => cargarMyTeam(parseInt(e.target.value));
  }

  await cargarMyTeam(JORNADA_VISIBLE);
}

async function cargarMyTeam(jornada) {
  if (!currentUser) return;

  document.getElementById('myteam-jornada-num').textContent = jornada;

  const { data, error } = await db
    .from('mi_equipo_detalle')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('jornada', jornada)
    .order('posicion');

  const grid   = document.getElementById('myteam-grid');
  const empty  = document.getElementById('myteam-empty');
  const banner = document.getElementById('myteam-banner');

  if (error || !data?.length) {
    grid.innerHTML = '';
    banner.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  const ids = data.map(j => j.jugador_id);
  const { data: jugData } = await db
    .from('jugadores')
    .select('id, escudo_url, foto_url, valor')
    .in('id', ids);

  const escudoMap = {};
  const fotoMap = {};
  const valorMap = {};
  (jugData || []).forEach(j => {
    escudoMap[j.id] = j.escudo_url;
    fotoMap[j.id] = j.foto_url;
    valorMap[j.id] = j.valor;
  });

  const { data: capData } = await db
    .from('mi_equipo')
    .select('jugador_id, capitan')
    .eq('user_id', currentUser.id)
    .eq('jornada', jornada)
    .eq('capitan', true)
    .single();

  const capitanId = capData?.jugador_id || null;

  const orden = ['POR','DEF','MED','DEL','ENT'];
  const sorted = [...data].sort((a,b) => orden.indexOf(a.posicion) - orden.indexOf(b.posicion));

  const totalPuntos = sorted.reduce((acc, j) => {
    const pts = j.puntos || 0;
    return acc + (j.jugador_id === capitanId ? pts * 2 : pts);
  }, 0);

  const formacion = data[0]?.formacion || '—';

  banner.style.display = 'block';
  banner.innerHTML = `
    <div class="saved-sub">Formación <strong>${formacion}</strong> · Jornada ${jornada}</div>
    <div class="saved-pts-high"><strong>${totalPuntos} PUNTOS</strong></div>
  `;

  grid.innerHTML = sorted.map(j => {
    const escudo = escudoMap[j.jugador_id];
    const foto = fotoMap[j.jugador_id];

    const avatarContenido = foto
      ? `<img src="${foto}" width="40" height="40"
           style="object-fit:cover;border-radius:50%"
           onerror="this.style.display='none'">`
      : j.nombre.substring(0,2).toUpperCase();

    const esCapitan = j.jugador_id === capitanId;
    const puntosFinales = esCapitan ? j.puntos * 2 : j.puntos;

    return `<div class="player-card ${esCapitan ? 'card-capitan' : ''}"
                 style="cursor:pointer"
                 onclick="mostrarDesgloseMyTeam('${j.jugador_id}', '${j.nombre}', '${j.posicion}', ${jornada})">
      <div class="pc-avatar"
           style="position:relative;background:${POS_COLORS[j.posicion]};color:${POS_TEXT[j.posicion]};overflow:visible">
        ${avatarContenido}
        ${escudo
          ? `<img src="${escudo}" width="14" height="14"
                 style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;
                        border-radius:50%;background:white;border:1px solid rgba(0,0,0,0.2)">`
          : ''}
      </div>
      <div class="pc-info">
        <div class="pc-name">${j.nombre} ${esCapitan ? '⭐' : ''}</div>
        <div class="pc-meta">${j.posicion} · ${j.club} · ${valorMap[j.jugador_id] || 0}M${esCapitan ? ' · Capitán - Puntúa doble' : ''}</div>
      </div>
      <div class="pc-pts">
        ${puntosFinales}
      </div>
    </div>`;
  }).join('');

  const { data: equipoData } = await db
    .from('equipos')
    .select('nombre_equipo')
    .eq('user_id', currentUser.id)
    .single();

  const inputNombre = document.getElementById('input-nombre-equipo');
  if (inputNombre && equipoData?.nombre_equipo) {
    inputNombre.value = equipoData.nombre_equipo;
    document.querySelectorAll('.menu-nombre-equipo, #menu-nombre-equipo')
      .forEach(el => el.value = equipoData.nombre_equipo);
  }
}


/* ── 6. CLASIFICACIÓN ────────────────────────────────────── */

const medalClass = pos => pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : '';

async function loadRanking() {
  document.getElementById('ranking-jornada-num').textContent = JORNADA_VISIBLE;

  // Eventos de las pestañas
  document.querySelectorAll('.ranking-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.rtab-content').forEach(c => c.style.display = 'none');
      tab.classList.add('active');
      document.getElementById('rtab-' + tab.dataset.rtab).style.display = 'block';
    };
  });

  // ── Clasificación semanal con select ──
  const cargarSemanal = async (jornadaSel) => {
    const { data: semanal } = await db
      .from('clasificacion_automatica')
      .select('*')
      .eq('jornada', jornadaSel)
      .order('puntos', { ascending: false });

    const tbody = document.getElementById('ranking-body');
    if (!semanal?.length) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:28px">Sin datos para la jornada ${jornadaSel}</td></tr>`;
    } else {
      tbody.innerHTML = semanal.map((r, i) => `
        <tr class="${medalClass(i+1)}">
          <td><span class="rank-pos ${medalClass(i+1)}">${i+1}</span></td>
          <td><div class="rank-team">${r.nombre_equipo}</div></td>
          <td><div class="rank-pts">${r.puntos}</div></td>
        </tr>
      `).join('');
    }
  };

  const selectSemanal = document.getElementById('semanal-jornada-select');
  if (selectSemanal) {
    selectSemanal.innerHTML = '';
    for (let i = JORNADA_ACTIVA; i >= 1; i--) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `Jornada ${i}`;
      selectSemanal.appendChild(opt);
    }
    selectSemanal.value = JORNADA_VISIBLE;
    cargarSemanal(JORNADA_VISIBLE);
    selectSemanal.addEventListener('change', e => cargarSemanal(parseInt(e.target.value)));
  }

  // ── Clasificación general ──
  const { data: general } = await db
    .from('clasificacion_general_auto')
    .select('*');

  const tbodyGeneral = document.getElementById('ranking-general-body');
  if (!general?.length) {
    tbodyGeneral.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:28px">Sin datos</td></tr>`;
  } else {
    tbodyGeneral.innerHTML = general.map((r, i) => `
      <tr class="${medalClass(i+1)}">
        <td><span class="rank-pos ${medalClass(i+1)}">${i+1}</span></td>
        <td><div class="rank-team">${r.nombre_equipo}</div></td>
        <td><div class="rank-pts">${r.puntos_total}</div></td>
      </tr>
    `).join('');
  }

  // ── Ranking jugadores ──
  const { data: jugadores } = await db
    .from('ranking_jugadores')
    .select('*');

  const clubes = [...new Set((jugadores || []).map(j => j.club))].sort();
  const posiciones = ['POR','DEF','MED','DEL','ENT'];

  document.getElementById('rtab-jugadores').innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <select id="filtro-club" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-family:var(--font-display);font-size:14px;cursor:pointer">
        <option value="">Todos los clubes</option>
        ${clubes.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <select id="filtro-pos" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-family:var(--font-display);font-size:14px;cursor:pointer">
        <option value="">Todas las posiciones</option>
        ${posiciones.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
      <input id="filtro-nombre" type="text" placeholder="Buscar jugador..."
        style="padding:8px 12px;font-family:var(--font-mono);font-size:13px;
               background:var(--surface);color:var(--text);border:1px solid var(--border);
               border-radius:8px;min-width:160px;">
      <button id="btn-reset-filtros">Reiniciar filtros</button>
    </div>
    <table class="ranking-table">
      <thead><tr><th>#</th><th>Jugador</th><th>Club</th><th style="text-align:right">Pts</th></tr></thead>
      <tbody id="ranking-jugadores-body"></tbody>
    </table>
  `;

  const renderJugadores = () => {
    const club   = document.getElementById('filtro-club').value;
    const pos    = document.getElementById('filtro-pos').value;
    const nombre = document.getElementById('filtro-nombre').value.toLowerCase();

    const filtrados = (jugadores || []).filter(j =>
      (!club   || j.club === club) &&
      (!pos    || j.posicion === pos) &&
      (!nombre || j.nombre.toLowerCase().includes(nombre))
    );

    const tbody = document.getElementById('ranking-jugadores-body');

    if (!filtrados.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:28px">Sin resultados</td></tr>`;
      return;
    }

    tbody.innerHTML = filtrados.map((j, i) => `
      <tr class="${medalClass(i+1)}">
        <td><span class="rank-pos ${medalClass(i+1)}">${i+1}</span></td>
        <td>
          <div class="rank-name" style="cursor:pointer;text-decoration:underline"
               onclick="mostrarHistorial('${j.nombre}', '${j.club}', '${j.posicion}')">${j.nombre}</div>
          <div class="rank-team">${j.posicion}</div>
        </td>
        <td>
          ${j.escudo_url ? `<img src="${j.escudo_url}" width="24" height="24" style="object-fit:contain;vertical-align:middle;margin-right:6px" onerror="this.style.display='none'">` : ''}
          <span class="rank-team">${j.club}</span>
        </td>
        <td><div class="rank-pts">${j.puntos_total}</div></td>
      </tr>
    `).join('');
  };

  renderJugadores();
  document.getElementById('filtro-club').addEventListener('change', renderJugadores);
  document.getElementById('filtro-pos').addEventListener('change', renderJugadores);
  document.getElementById('filtro-nombre').addEventListener('input', renderJugadores);
  document.getElementById('btn-reset-filtros').addEventListener('click', () => {
    document.getElementById('filtro-club').value = '';
    document.getElementById('filtro-pos').value = '';
    document.getElementById('filtro-nombre').value = '';
    renderJugadores();
  });

  // ── Once de la semana ──
  const selectOnce = document.getElementById('once-jornada-select');
  if (selectOnce) {
    selectOnce.innerHTML = '';
    for (let i = JORNADA_ACTIVA; i >= 1; i--) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `Jornada ${i}`;
      selectOnce.appendChild(opt);
    }
    selectOnce.value = JORNADA_VISIBLE;
    loadOnce(JORNADA_VISIBLE);
    selectOnce.addEventListener('change', e => loadOnce(parseInt(e.target.value)));
  }
}


/* ── 7. ARRANQUE ─────────────────────────────────────────── */

async function guardarNombreEquipo() {
  if (!currentUser) return;
  const nombre = document.getElementById('input-nombre-equipo').value.trim();
  if (!nombre) { showToast('Escribe un nombre para tu equipo', true); return; }

  const { error } = await db.from('equipos').upsert({
    user_id: currentUser.id,
    nombre_equipo: nombre,
  }, { onConflict: 'user_id' });

  if (error) showToast('Error al guardar: ' + error.message, true);
  else showToast('Nombre de equipo guardado');
}

document.getElementById('btn-guardar-equipo')?.addEventListener('click', guardarNombreEquipo);
document.getElementById('btn-export-png')?.addEventListener('click', exportarAlineacion);

async function loadOnce(jornada) {
  const container = document.getElementById('once-container');
  container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--text-muted)">Cargando...</div>';

  const { data, error } = await db
    .from('jugadores')
    .select('nombre, club, posicion, puntos, escudo_url, foto_url')
    .eq('jornada', jornada)
    .neq('posicion', 'ENT')
    .order('puntos', { ascending: false });

  if (error || !data?.length) {
    container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--text-muted)">Sin datos para esta jornada</div>';
    return;
  }

  const porPos = { POR:[], DEF:[], MED:[], DEL:[] };
  data.forEach(j => porPos[j.posicion]?.push(j));

  const portero = porPos.POR.sort((a, b) => b.puntos - a.puntos || a.valor - b.valor).slice(0, 1);
  const defs = porPos.DEF.sort((a, b) => b.puntos - a.puntos || a.valor - b.valor);
  const meds = porPos.MED.sort((a, b) => b.puntos - a.puntos || a.valor - b.valor);
  const dels = porPos.DEL.sort((a, b) => b.puntos - a.puntos || a.valor - b.valor);

  let defOnce = defs.slice(0, 3);
  let medOnce = meds.slice(0, 3);
  let delOnce = dels.slice(0, 1);

  const candidatos = [
    ...defs.slice(3, 5).map(j => ({ ...j, _pos: 'DEF' })),
    ...meds.slice(3, 4).map(j => ({ ...j, _pos: 'MED' })),
    ...dels.slice(1, 3).map(j => ({ ...j, _pos: 'DEL' })),
  ].sort((a, b) => b.puntos - a.puntos || a.valor - b.valor);

  let huecos = 3;
  for (const c of candidatos) {
    if (huecos === 0) break;
    if (c._pos === 'DEF' && defOnce.length < 5) { defOnce.push(c); huecos--; }
    else if (c._pos === 'MED' && medOnce.length < 4) { medOnce.push(c); huecos--; }
    else if (c._pos === 'DEL' && delOnce.length < 3) { delOnce.push(c); huecos--; }
  }

  const filas = [
    { label: '🧤 PORTERO',       jugadores: portero },
    { label: '🛑 DEFENSAS',       jugadores: defOnce },
    { label: '🧠 MEDIOCENTROS', jugadores: medOnce },
    { label: '⚽ DELANTEROS',     jugadores: delOnce },
  ];

  const totalPuntos = [...portero, ...defOnce, ...medOnce, ...delOnce]
    .reduce((acc, j) => acc + j.puntos, 0);
    if (totalPuntos === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);font-family:var(--font-display);font-size:18px;letter-spacing:1px">Aún no tenemos el once de la jornada</div>';
        return;
      }

  const formacionOnce = `${defOnce.length}-${medOnce.length}-${delOnce.length}`;

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;
                  margin-bottom:12px;">
        <div style="font-family:var(--font-display);font-size:20px;font-weight:700;
                    color:var(--neon);letter-spacing:2px">
          Formación: ${formacionOnce}
        </div>
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);letter-spacing:1px">
          TOTAL: <strong style="color:var(--neon)">${totalPuntos} pts</strong>
        </div>
      </div>
    ${filas.map(fila => `
      <div style="margin-bottom:20px">
        <div style="font-family:var(--font-display);font-size:12px;font-weight:700;
                    letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);
                    border-bottom:1px solid var(--border);padding-bottom:6px;margin-bottom:10px">
          ${fila.label}
        </div>
        ${fila.jugadores.map(j => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;
                      border-bottom:1px solid var(--border)">
            ${j.escudo_url
              ? `<img src="${j.escudo_url}" width="28" height="28" style="object-fit:contain" onerror="this.style.display='none'">`
              : `<div style="width:28px;height:28px;background:var(--surface);border-radius:50%;
                             display:flex;align-items:center;justify-content:center;
                             font-family:var(--font-display);font-size:10px">${j.club}</div>`
            }
            <div style="flex:1">
              <div style="font-family:var(--font-display);font-weight:600;font-size:15px;color:var(--text)">${j.nombre}</div>
              <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${j.club} · ${j.posicion}</div>
            </div>
            <div style="font-family:var(--font-display);font-weight:700;font-size:22px;color:var(--neon)">${j.puntos}</div>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;
}

(async function init() {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    updateNavUser(currentUser);
    goTo('home');
  }
})();