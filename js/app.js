/* ============================================================
   js/app.js  —  Lógica completa de FantasiLiga
   ============================================================ */

/* ── 1. UTILIDADES ───────────────────────────────────────── */

let currentUser = null;

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#b03020' : '#1a1a16';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function toggleUserMenu() {
  const menus = ['user-menu', 'user-menu-lineup', 'user-menu-myteam', 'user-menu-ranking'];
  const screenActiva = document.querySelector('.screen.active');
  const menuId = screenActiva?.id === 'screen-home'     ? 'user-menu' :
                 screenActiva?.id === 'screen-lineup'   ? 'user-menu-lineup' :
                 screenActiva?.id === 'screen-myteam'   ? 'user-menu-myteam' :
                 screenActiva?.id === 'screen-ranking'  ? 'user-menu-ranking' : 'user-menu';

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
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + screenId);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
  const loaders = { home: loadHome, lineup: loadLineup, myteam: loadMyTeam, ranking: loadRanking };
  if (loaders[screenId]) loaders[screenId]();
}

function updateNavUser(user) {
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  ['', '-lineup', '-myteam', '-ranking'].forEach(s => {
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

  const container = document.getElementById('matches-container');
  container.innerHTML = PARTIDOS.map(p => `
    <div class="match-card">
      <div class="match-team">
        <div class="crest" style="background:${p.local.color};color:white;display:flex;align-items:center;justify-content:center">
          ${p.local.escudo_url
            ? `<img src="${p.local.escudo_url}" alt="${p.local.abrev}" width="56" height="56" style="object-fit:contain" onerror="this.outerHTML='${p.local.abrev}'">`
            : p.local.abrev}
        </div>
        <div>
          <div class="team-name">${p.local.nombre}</div>
          <div class="match-date"></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;padding:0 6px;min-width:80px;max-width:90px">
        <div class="match-vs">${p.estadio}</div>
        <div class="match-date">${p.fecha}</div>
      </div>
      <div class="match-team right">
        <div class="crest" style="background:${p.visitante.color};color:white;display:flex;align-items:center;justify-content:center">
          ${p.visitante.escudo_url
            ? `<img src="${p.visitante.escudo_url}" alt="${p.visitante.abrev}" width="56" height="56" style="object-fit:contain" onerror="this.outerHTML='${p.visitante.abrev}'">`
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

  jugadoresPorPos = { POR:[], DEF:[], MED:[], DEL:[], ENT:[] };
  (data || []).forEach(j => {
    if (jugadoresPorPos[j.posicion]) jugadoresPorPos[j.posicion].push(j);
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
      showToast('Alineación anterior cargada ✓');
    }
  }

  setTimeout(() => renderPitch(), 100);
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
        const circuloContenido = jugador.escudo_url
          ? `<img src="${jugador.escudo_url}" alt="${jugador.club}"
               width="28" height="28" style="object-fit:contain;border-radius:50%"
               onerror="this.outerHTML='${jugador.nombre.substring(0,3).toUpperCase()}'">`
          : jugador.nombre.substring(0,3).toUpperCase();

        slot.innerHTML = `
          <div class="player-circle ${fila.cls} ${esCap ? 'es-capitan' : ''}" style="overflow:hidden;position:relative">
            ${circuloContenido}
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
      const escudo = j.escudo_url
        ? `<img src="${j.escudo_url}" alt="${j.club}" width="32" height="32"
               style="object-fit:contain;border-radius:2px"
               onerror="this.style.display='none'">`
        : `<div class="modal-player-circle"
                style="background:${colores[cls]};color:${textoCols[cls]}">
             ${j.nombre.substring(0,2).toUpperCase()}
           </div>`;

      return `<div class="modal-player" data-id="${j.id}" data-slot="${slotId}"
                style="opacity:${usado ? 0.35 : 1};pointer-events:${usado ? 'none' : 'auto'}">
        ${escudo}
        <div>
          <div class="modal-player-name">${j.nombre}</div>
          <div class="modal-player-meta">
            ${j.club} · ${j.posicion} · ${j.puntos} pts
            ${j.rival ? `· vs ${j.rival} (${j.es_local ? '🏠' : '✈️'})` : ''}
          </div>
        </div>
        <div class="modal-player-pts">${j.puntos}</div>
      </div>`;
    }).join('');

    document.querySelectorAll('.modal-player').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        seleccionados[slotId] = jugadoresPorPos[posicion].find(j => j.id === id);
        closeModal();
        renderPitch();
        actualizarSelectCapitan();
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
  else       showToast('Alineación guardada ✓');
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

async function loadMyTeam() {
  if (!currentUser) return;

  document.getElementById('myteam-jornada-num').textContent = JORNADA_ACTIVA;

  const { data, error } = await db
    .from('mi_equipo_detalle')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('jornada', JORNADA_ACTIVA)
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

  // Obtener escudos
  const ids = data.map(j => j.jugador_id);
  const { data: jugData } = await db
    .from('jugadores')
    .select('id, escudo_url')
    .in('id', ids);

  const escudoMap = {};
  (jugData || []).forEach(j => escudoMap[j.id] = j.escudo_url);

  // Obtener capitán
  const { data: capData } = await db
    .from('mi_equipo')
    .select('jugador_id, capitan')
    .eq('user_id', currentUser.id)
    .eq('jornada', JORNADA_ACTIVA)
    .eq('capitan', true)
    .single();

  const capitanId = capData?.jugador_id || null;

  const orden = ['POR','DEF','MED','DEL','ENT'];
  const sorted = [...data].sort((a,b) => orden.indexOf(a.posicion) - orden.indexOf(b.posicion));

  // Total de puntos (capitán cuenta doble)
  const totalPuntos = sorted.reduce((acc, j) => {
    const pts = j.puntos || 0;
    return acc + (j.jugador_id === capitanId ? pts * 2 : pts);
  }, 0);

  const formacion = data[0]?.formacion || '—';
  const nombres = sorted.map(j => j.nombre).join(', ');

  banner.style.display = 'block';
  banner.innerHTML = `
    <div class="saved-title">¡Este es tu once! Suerte</div>
    <div class="saved-sub">Formación <strong>${formacion}</strong> · Jornada ${JORNADA_ACTIVA}</div>
    <div class="saved-pts-high"><strong>${totalPuntos} PUNTOS</strong></div>
    <br>
    <button class="btn-modificar" data-target="lineup">¿Deseas modificarlo?</button>
  `;

  grid.innerHTML = sorted.map(j => {
    const escudo = escudoMap[j.jugador_id];
    const avatarContenido = escudo
      ? `<img src="${escudo}" alt="${j.club}" width="30" height="30"
           style="object-fit:contain"
           onerror="this.style.display='none'">`
      : j.nombre.substring(0,2).toUpperCase();

    const esCapitan = j.jugador_id === capitanId;
    const puntosFinales = esCapitan ? j.puntos * 2 : j.puntos;

    return `<div class="player-card ${esCapitan ? 'card-capitan' : ''}">
      <div class="pc-avatar"
           style="background:${POS_COLORS[j.posicion]};color:${POS_TEXT[j.posicion]};overflow:hidden">
        ${avatarContenido}
      </div>
      <div class="pc-info">
        <div class="pc-name">${j.nombre} ${esCapitan ? '⭐' : ''}</div>
        <div class="pc-meta">${j.posicion} · ${j.club}${esCapitan ? ' · Capitán - Puntúa doble' : ''}</div>
      </div>
      <div class="pc-pts">
        ${puntosFinales}
        ${esCapitan ? '<span style="font-size:11px;display:block;color:var(--pitch-dark)"></span>' : ''}
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
  }
}


/* ── 6. CLASIFICACIÓN ────────────────────────────────────── */

const medalClass = pos => pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : '';

async function loadRanking() {
  const jornada = JORNADA_ACTIVA;
  document.getElementById('ranking-jornada-num').textContent = jornada;

  // Eventos de las pestañas
  document.querySelectorAll('.ranking-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.rtab-content').forEach(c => c.style.display = 'none');
      tab.classList.add('active');
      document.getElementById('rtab-' + tab.dataset.rtab).style.display = 'block';
    };
  });

  // ── Clasificación semanal ──
  const { data: semanal } = await db
    .from('clasificacion_automatica')
    .select('*')
    .eq('jornada', jornada)
    .order('puntos', { ascending: false });

  const tbody = document.getElementById('ranking-body');
  if (!semanal?.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:28px">Sin datos para la jornada ${jornada}</td></tr>`;
  } else {
    tbody.innerHTML = semanal.map((r, i) => `
      <tr class="${medalClass(i+1)}">
        <td><span class="rank-pos ${medalClass(i+1)}">${i+1}</span></td>
        <td><div class="rank-name">${r.nombre}</div></td>
        <td><div class="rank-team">${r.nombre_equipo}</div></td>
        <td><div class="rank-pts">${r.puntos}</div></td>
      </tr>
    `).join('');
  }

  // ── Clasificación general ──
  const { data: general } = await db
    .from('clasificacion_general_auto')
    .select('*');

  const tbodyGeneral = document.getElementById('ranking-general-body');
  if (!general?.length) {
    tbodyGeneral.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:28px">Sin datos</td></tr>`;
  } else {
    tbodyGeneral.innerHTML = general.map((r, i) => `
      <tr class="${medalClass(i+1)}">
        <td><span class="rank-pos ${medalClass(i+1)}">${i+1}</span></td>
        <td><div class="rank-name">${r.nombre}</div></td>
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
  const posiciones = ['POR','DEF','MED','DEL'];

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
    </div>
    <table class="ranking-table">
      <thead><tr><th>#</th><th>Jugador</th><th>Club</th><th style="text-align:right">Pts</th></tr></thead>
      <tbody id="ranking-jugadores-body"></tbody>
    </table>
  `;

  const renderJugadores = () => {
    const club = document.getElementById('filtro-club').value;
    const pos  = document.getElementById('filtro-pos').value;

    const filtrados = (jugadores || []).filter(j =>
      (!club || j.club === club) &&
      (!pos  || j.posicion === pos)
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
          <div class="rank-name">${j.nombre}</div>
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
  else showToast('Nombre de equipo guardado ✓');
}

document.getElementById('btn-guardar-equipo')?.addEventListener('click', guardarNombreEquipo);

(async function init() {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    updateNavUser(currentUser);
    goTo('home');
  }
})();