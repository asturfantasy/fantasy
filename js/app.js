/* ============================================================
   js/app.js  —  Lógica completa de FantasiLiga
   Secciones:
     1. Utilidades (toast, router, nav)
     2. Autenticación (Google OAuth)
     3. Home (partidos)
     4. Alineación (campo + modal)
     5. Mi Equipo
     6. Clasificación
     7. Arranque (init)
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
    if (av) av.textContent = initials;
    if (un) un.textContent = name.split(' ')[0];
  });
}

// Helper: renderiza un escudo como <img> si hay URL, o como texto si no
function escudoHtml(escudo_url, club, size = 32) {
  if (escudo_url) {
    return `<img src="${escudo_url}" alt="${club}" width="${size}" height="${size}"
              style="object-fit:contain;border-radius:2px;"
              onerror="this.style.display='none';this.nextSibling.style.display='flex'">
            <span style="display:none;width:${size}px;height:${size}px;align-items:center;justify-content:center;font-family:var(--font-display);font-size:${Math.round(size*0.35)}px">${club}</span>`;
  }
  return `<span style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:${Math.round(size*0.35)}px">${club}</span>`;
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
  document.getElementById('home-bienvenida').textContent = '¡Bienvenido, ' + userName + '!';

  const container = document.getElementById('matches-container');
  container.innerHTML = PARTIDOS.map(p => `
    <div class="match-card">
      <div class="match-team">
        <div class="crest" style="background:${p.local.color};color:white;display:flex;align-items:center;justify-content:center">
          ${p.local.escudo_url
            ? `<img src="${p.local.escudo_url}" alt="${p.local.abrev}" width="40" height="40" style="object-fit:contain" onerror="this.outerHTML='${p.local.abrev}'">`
            : p.local.abrev}
        </div>
        <div>
          <div class="team-name">${p.local.nombre}</div>

        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px">
        <div class="match-vs">${p.estadio}</div>
        <div class="match-date">${p.fecha}</div>
      </div>
      <div class="match-team right">
        <div class="crest" style="background:${p.visitante.color};color:white;display:flex;align-items:center;justify-content:center">
          ${p.visitante.escudo_url
            ? `<img src="${p.visitante.escudo_url}" alt="${p.visitante.abrev}" width="40" height="40" style="object-fit:contain" onerror="this.outerHTML='${p.visitante.abrev}'">`
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
  '3-4-3': { def:3, mid:4, fwd:3 },
  '3-5-2': { def:3, mid:5, fwd:2 },
  '5-3-2': { def:5, mid:3, fwd:2 },
  '4-4-2': { def:4, mid:4, fwd:2 },
};

let seleccionados = {};
let jugadoresPorPos = { POR:[], DEF:[], MED:[], DEL:[] };

async function loadLineup() {
  document.getElementById('lineup-jornada').textContent = JORNADA_ACTIVA;
  seleccionados = {};

  const { data, error } = await db
    .from('jugadores')
    .select('*')
    .eq('jornada', JORNADA_ACTIVA)
    .eq('activo', 1)
    .order('puntos', { ascending: false });

  if (error) { showToast('Error cargando jugadores', true); return; }

  jugadoresPorPos = { POR:[], DEF:[], MED:[], DEL:[] };
  (data || []).forEach(j => jugadoresPorPos[j.posicion]?.push(j));

  renderPitch();
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
        // Círculo con escudo si existe, si no iniciales
        const circuloContenido = jugador.escudo_url
          ? `<img src="${jugador.escudo_url}" alt="${jugador.club}"
               width="28" height="28" style="object-fit:contain;border-radius:50%"
               onerror="this.outerHTML='${jugador.nombre.substring(0,3).toUpperCase()}'">`
          : jugador.nombre.substring(0,3).toUpperCase();

        slot.innerHTML = `
          <div class="player-circle ${fila.cls}" style="overflow:hidden">${circuloContenido}</div>
          <div class="player-name">${jugador.nombre}</div>
          <div class="pos-badge">${jugador.club}</div>`;
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
  const labels = { POR:'Portero', DEF:'Defensa', MED:'Mediocampista', DEL:'Delantero' };
  document.getElementById('modal-title').textContent = 'Seleccionar ' + labels[posicion];

  const usados = new Set(Object.values(seleccionados).map(j => j.id));
  const list = document.getElementById('modal-list');

  const colores = { gk:'var(--amber)', def:'var(--blue)', mid:'var(--ink)', fwd:'var(--red)' };
  const textoCols = { gk:'var(--ink)', def:'white', mid:'var(--cream)', fwd:'white' };

  // 1. Buscador + contenedor de jugadores
  list.innerHTML = `
    <div style="padding:12px 20px;border-bottom:1px solid var(--cream-dark);position:sticky;top:0;background:var(--cream);z-index:1">
      <input id="modal-search" type="text" placeholder="Buscar jugador..."
        style="width:100%;padding:8px 12px;font-family:var(--font-mono);font-size:13px;
               border:2px solid var(--ink);border-radius:4px;background:var(--white);color:var(--ink)">
    </div>
    <div id="modal-players"></div>
  `;

  // 2. Función que filtra y pinta la lista
  const renderLista = (filtro = '') => {
    const jugadoresFiltrados = jugadoresPorPos[posicion].filter(j =>
      j.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      j.club.toLowerCase().includes(filtro.toLowerCase())
    );

    document.getElementById('modal-players').innerHTML = jugadoresFiltrados.map(j => {
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
          <div class="modal-player-meta">${j.club} · ${j.posicion}</div>
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
      });
    });
  };

  // 3. Pintar lista inicial y activar buscador
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

document.getElementById('formation-select').addEventListener('change', renderPitch);

document.getElementById('btn-save-lineup').addEventListener('click', async () => {
  if (!currentUser) { showToast('Debes iniciar sesión', true); return; }

  const formacion = document.getElementById('formation-select').value;
  const { def, mid, fwd } = FORMACIONES[formacion];
  const totalSlots = 1 + def + mid + fwd;

  if (Object.keys(seleccionados).length < totalSlots) {
    showToast('Faltan jugadores por seleccionar', true);
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
  }));

  const { error } = await db.from('mi_equipo').insert(filas);
  if (error) showToast('Error al guardar: ' + error.message, true);
  else       showToast('Alineación guardada ✓');
});


/* ── 5. MI EQUIPO ────────────────────────────────────────── */

const POS_COLORS = { POR:'var(--yellow)', DEF:'var(--blue)', MED:'var(--green)', DEL:'var(--red)' };
const POS_TEXT   = { POR:'var(--black)',   DEF:'white',       MED:'white', DEL:'white' };

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

  // Necesitamos escudo_url que no está en la vista, lo sacamos de jugadores
  const ids = data.map(j => j.jugador_id);
  const { data: jugData } = await db
    .from('jugadores')
    .select('id, escudo_url')
    .in('id', ids);

  const escudoMap = {};
  (jugData || []).forEach(j => escudoMap[j.id] = j.escudo_url);

  const orden = ['POR','DEF','MED','DEL'];
  const sorted = [...data].sort((a,b) => orden.indexOf(a.posicion) - orden.indexOf(b.posicion));

  // Banner: equipo ya guardado
  const formacion = data[0]?.formacion || '—';
  const nombres = sorted.map(j => j.nombre).join(', ');
  const totalPuntos = sorted.reduce((acc, j) => acc + (j.puntos || 0), 0);
  banner.style.display = 'block';
  banner.innerHTML = `
    <div class="saved-title">¡Ya tienes tu equipo guardado!</div>
    <div class="saved-sub"><strong>Recuerda que puedes modificar el once hasta el inicio de la jornada</strong></div>
    <div class="saved-sub">Formación <strong>${formacion}</strong> · Jornada ${JORNADA_ACTIVA}</div>
    <div class="saved-pts-high"><strong>${totalPuntos} puntos</strong></div>
    <div class="saved-players">Esta es tu alineación: ${nombres}</div>
    <button class="btn-modificar" data-target="lineup">¿Deseas modificarlo? Hazlo aquí</button>
  `;

  grid.innerHTML = sorted.map(j => {
    const escudo = escudoMap[j.jugador_id];
    const avatarContenido = escudo
      ? `<img src="${escudo}" alt="${j.club}" width="30" height="30"
           style="object-fit:contain"
           onerror="this.style.display='none'">`
      : j.nombre.substring(0,2).toUpperCase();

    return `<div class="player-card">
      <div class="pc-avatar"
           style="background:${POS_COLORS[j.posicion]};color:${POS_TEXT[j.posicion]};overflow:hidden">
        ${avatarContenido}
      </div>
      <div class="pc-info">
        <div class="pc-name">${j.nombre}</div>
        <div class="pc-meta">${j.posicion} · ${j.club}</div>
      </div>
      <div class="pc-pts">${j.puntos}</div>
    </div>`;
  }).join('');
}


/* ── 6. CLASIFICACIÓN ────────────────────────────────────── */

async function loadRanking() {
  const jornada = JORNADA_ACTIVA - 1;
  document.getElementById('ranking-jornada-num').textContent = jornada;

  const { data, error } = await db
    .from('clasificacion')
    .select('*')
    .eq('jornada', jornada)
    .order('posicion', { ascending: true });

  const tbody = document.getElementById('ranking-body');

  if (error || !data?.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--ink-light);padding:28px;font-family:var(--font-mono)">Sin datos para la jornada ${jornada}</td></tr>`;
    return;
  }

  const medalClass = pos => pos === 1 ? 'gold' : pos === 2 ? 'silver' : '';

  tbody.innerHTML = data.map(r => `
    <tr>
      <td><span class="rank-pos ${medalClass(r.posicion)}">${r.posicion}</span></td>
      <td><div class="rank-name">${r.nombre}</div></td>
      <td><div class="rank-team">${r.nombre_equipo}</div></td>
      <td><div class="rank-pts">${r.puntos}</div></td>
    </tr>
  `).join('');
}


/* ── 7. ARRANQUE ─────────────────────────────────────────── */

(async function init() {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    updateNavUser(currentUser);
    goTo('home');
  }
})();