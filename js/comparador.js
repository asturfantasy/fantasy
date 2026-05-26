/* ============================================================
   js/comparador.js  —  Comparador de jugadores
   ============================================================ */

let todosLosJugadores = [];
let comparadorSeleccionados = [null, null];

async function loadComparador() {
  const { data } = await db.from('ranking_jugadores').select('nombre, club, posicion, puntos_total, valor, escudo_url, foto_url');
  todosLosJugadores = data || [];

  const clubes = [...new Set(todosLosJugadores.map(j => j.club))].sort();
  const posiciones = ['POR','DEF','MED','DEL','ENT'];

  comparadorSeleccionados = [null, null];

  const container = document.getElementById('comparador-container');
  container.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <select id="comp-filtro-club" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:7px 10px;font-family:var(--font-display);font-size:13px;cursor:pointer">
        <option value="">Todos los clubes</option>
        ${clubes.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <select id="comp-filtro-pos" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:7px 10px;font-family:var(--font-display);font-size:13px;cursor:pointer">
        <option value="">Todas las posiciones</option>
        ${posiciones.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
      <button onclick="reiniciarComparador()" style="background:var(--neon);color:#0d1117;border:none;border-radius:8px;padding:7px 14px;font-family:var(--font-display);font-weight:700;font-size:13px;cursor:pointer;letter-spacing:1px">REINICIAR</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      ${[0,1].map(i => `
        <div>
          <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Jugador ${i+1}</div>
          <div style="position:relative">
            <input id="buscador-${i}" type="text" placeholder="Buscar..."
              style="width:100%;padding:8px 10px;font-family:var(--font-display);font-size:12px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;box-sizing:border-box"
              oninput="filtrarSugerencias(${i})" onclick="filtrarSugerencias(${i})" autocomplete="off">
            <div id="sugerencias-${i}" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:8px;z-index:100;max-height:180px;overflow-y:auto;margin-top:2px"></div>
          </div>
          <div id="seleccionado-${i}" style="margin-top:8px"></div>
        </div>
      `).join('')}
    </div>
    <div id="resultado-comparador"></div>`;

  document.getElementById('comp-filtro-club').addEventListener('change', () => { filtrarSugerencias(0); filtrarSugerencias(1); });
  document.getElementById('comp-filtro-pos').addEventListener('change', () => { filtrarSugerencias(0); filtrarSugerencias(1); });
}

function getJugadoresFiltrados() {
  const club = document.getElementById('comp-filtro-club')?.value || '';
  const pos  = document.getElementById('comp-filtro-pos')?.value || '';
  return todosLosJugadores.filter(j =>
    (!club || j.club === club) && (!pos || j.posicion === pos)
  );
}

function filtrarSugerencias(idx) {
  const input = document.getElementById(`buscador-${idx}`);
  const lista = document.getElementById(`sugerencias-${idx}`);
  if (!input || !lista) return;
  const q = input.value.toLowerCase().trim();
  const base = getJugadoresFiltrados();
  const filtrados = q.length >= 0
    ? base.filter(j => q === '' || j.nombre.toLowerCase().includes(q)).slice(0, 8)
    : [];
  if (!filtrados.length) { lista.style.display = 'none'; return; }
  lista.style.display = 'block';
  lista.innerHTML = filtrados.map(j => `
    <div onclick="seleccionarJugador(${idx}, '${j.nombre.replace(/'/g, "\\'")}')"
      style="display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;border-bottom:1px solid var(--border)"
      onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background=''">
      ${j.foto_url
        ? `<img src="${j.foto_url}" width="28" height="28" style="object-fit:cover;border-radius:50%;border:1px solid var(--border);flex-shrink:0">`
        : `<div style="width:28px;height:28px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:10px;color:var(--text-muted);flex-shrink:0">${j.nombre.substring(0,2).toUpperCase()}</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--font-display);font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${j.nombre}</div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">${j.posicion} · ${j.club} · ${j.valor || 0}M</div>
      </div>
      <div style="font-family:var(--font-display);font-weight:700;font-size:13px;color:var(--neon)">${j.puntos_total}</div>
    </div>`).join('');
}

async function seleccionarJugador(idx, nombre) {
  const jugador = todosLosJugadores.find(j => j.nombre === nombre);
  if (!jugador) return;
  comparadorSeleccionados[idx] = jugador;

  document.getElementById(`sugerencias-${idx}`).style.display = 'none';
  document.getElementById(`buscador-${idx}`).value = '';

  const colorPos = p => p === 'POR' ? 'var(--pos-gk)' : p === 'DEF' ? 'var(--pos-def)' : p === 'MED' ? 'var(--pos-mid)' : p === 'DEL' ? 'var(--pos-fwd)' : p === 'ENT' ? 'var(--pos-ent)' : 'var(--surface)';
  document.getElementById(`seleccionado-${idx}`).innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--surface);border-radius:8px;border:1px solid var(--border)">
      <div style="width:36px;height:36px;border-radius:50%;background:${colorPos(jugador.posicion)};padding:2px;box-sizing:border-box;flex-shrink:0">
        ${jugador.foto_url
          ? `<img src="${jugador.foto_url}" width="32" height="32" style="object-fit:cover;border-radius:50%;width:100%;height:100%;border:1px solid var(--border)">`
          : `<div style="width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:11px;color:#0d1117">${jugador.nombre.substring(0,2).toUpperCase()}</div>`}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--font-display);font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${jugador.nombre}</div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">${jugador.posicion} · ${jugador.club} · ${jugador.valor || 0}M</div>
      </div>
      <button onclick="limpiarJugador(${idx})" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:0;flex-shrink:0">✕</button>
    </div>`;

  if (comparadorSeleccionados[0] && comparadorSeleccionados[1]) await mostrarComparativa();
  else document.getElementById('resultado-comparador').innerHTML = '';
}

function limpiarJugador(idx) {
  comparadorSeleccionados[idx] = null;
  document.getElementById(`seleccionado-${idx}`).innerHTML = '';
  document.getElementById(`buscador-${idx}`).value = '';
  document.getElementById('resultado-comparador').innerHTML = '';
}

async function calcStatsEntrenador(nombre, club) {
  // Traer todas las jornadas del entrenador
  const [{ data: rawJornadas }, { data: partidosFinalizados }] = await Promise.all([
    db.from('jugadores').select('total_jornada, puntos_entrenador, amarilla, doble_amarilla, roja, jornada').eq('nombre', nombre).eq('posicion', 'ENT'),
    db.from('partidos').select('jornada').eq('finalizado', true).or(`local_abrev.eq.${club},visitante_abrev.eq.${club}`)
  ]);

  const jornadasFinalizadas = new Set((partidosFinalizados || []).map(p => p.jornada));
  const jornadas = (rawJornadas || []).filter(x => jornadasFinalizadas.has(x.jornada));
  if (!jornadas.length) return null;

  let victorias = 0, empates = 0, derrotas = 0;
  let goles_favor = 0, goles_contra = 0;
  let amarillas = 0, doble_am = 0, rojas = 0;

  for (const j of jornadas) {
    const pts = j.puntos_entrenador || 0;
    if (pts === 3) victorias++;
    else if (pts === 1) empates++;
    else if (pts === 0 && j.total_jornada !== null) derrotas++;

    amarillas += j.amarilla || 0;
    doble_am  += j.doble_amarilla || 0;
    rojas     += j.roja || 0;

    // Obtener partido primero para saber el rival exacto
    const { data: partido } = await db.from('partidos')
      .select('resultado_local, resultado_visitante, local_abrev, visitante_abrev')
      .eq('jornada', j.jornada)
      .or(`local_abrev.eq.${club},visitante_abrev.eq.${club}`)
      .single();

    const rivalAbrev = partido ? (partido.local_abrev === club ? partido.visitante_abrev : partido.local_abrev) : null;

    // Goles a favor: goles propios + penaltis + goles en propia del rival exacto
    const [{ data: jugClub }, { data: jugRival }] = await Promise.all([
      db.from('jugadores').select('gol, penalti').eq('club', club).eq('jornada', j.jornada).neq('posicion', 'ENT'),
      rivalAbrev ? db.from('jugadores').select('gol_pp').eq('club', rivalAbrev).eq('jornada', j.jornada).neq('posicion', 'ENT') : Promise.resolve({ data: [] })
    ]);

    if (jugClub?.length) {
      goles_favor += jugClub.reduce((a, x) => a + (x.gol || 0) + Math.max(0, x.penalti || 0), 0);
      goles_favor += (jugRival || []).reduce((a, x) => a + (x.gol_pp || 0), 0);
    }

    // Goles en contra: del marcador final
    if (partido) {
      const esLocal = partido.local_abrev === club;
      goles_contra += esLocal ? (partido.resultado_visitante || 0) : (partido.resultado_local || 0);
    }
  }

  return {
    puntos: jornadas.reduce((a, x) => a + (x.total_jornada || 0), 0),
    partidos: jornadas.filter(x => x.total_jornada !== null).length,
    victorias, empates, derrotas,
    goles_favor, goles_contra,
    amarillas, doble_am, rojas,
  };
}

async function mostrarComparativa() {
  const res = document.getElementById('resultado-comparador');
  res.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Cargando...</div>';

  const j1 = comparadorSeleccionados[0];
  const j2 = comparadorSeleccionados[1];
  const esEnt1 = j1.posicion === 'ENT';
  const esEnt2 = j2.posicion === 'ENT';

  let filas = [];

  if (esEnt1 || esEnt2) {
    // Al menos uno es entrenador — comparativa de entrenadores
    const [s1, s2] = await Promise.all([
      esEnt1 ? calcStatsEntrenador(j1.nombre, j1.club) : null,
      esEnt2 ? calcStatsEntrenador(j2.nombre, j2.club) : null,
    ]);
    const e1 = s1 || { puntos:0, partidos:0, victorias:0, empates:0, derrotas:0, goles_favor:0, goles_contra:0, amarillas:0, doble_am:0, rojas:0 };
    const e2 = s2 || { puntos:0, partidos:0, victorias:0, empates:0, derrotas:0, goles_favor:0, goles_contra:0, amarillas:0, doble_am:0, rojas:0 };
    filas = [
      ['Puntos',         e1.puntos,      e2.puntos,      e1.puntos,      e2.puntos,      'mayor'],
      ['Partidos',       e1.partidos,    e2.partidos,    e1.partidos,    e2.partidos,    'mayor'],
      ['Victorias',      e1.victorias,   e2.victorias,   e1.victorias,   e2.victorias,   'mayor'],
      ['Empates',        e1.empates,     e2.empates,     e1.empates,     e2.empates,     'none'],
      ['Derrotas',       e1.derrotas,    e2.derrotas,    e1.derrotas,    e2.derrotas,    'menor'],
      ['Goles a favor',  e1.goles_favor, e2.goles_favor, e1.goles_favor, e2.goles_favor, 'mayor'],
      ['Goles en contra',e1.goles_contra,e2.goles_contra,e1.goles_contra,e2.goles_contra,'menor'],
      ['Amarillas',      e1.amarillas,   e2.amarillas,   e1.amarillas,   e2.amarillas,   'menor'],
      ['Doble amarilla', e1.doble_am,    e2.doble_am,    e1.doble_am,    e2.doble_am,    'menor'],
      ['Rojas',          e1.rojas,       e2.rojas,       e1.rojas,       e2.rojas,       'menor'],
    ];
  } else {
    // Jugadores de campo
    const [r1, r2] = await Promise.all([
      db.from('jugadores').select('minutos,rol,gol,penalti,asistencia,gol_pp,amarilla,doble_amarilla,roja,goles_encajados,total_jornada').eq('nombre', j1.nombre),
      db.from('jugadores').select('minutos,rol,gol,penalti,asistencia,gol_pp,amarilla,doble_amarilla,roja,goles_encajados,total_jornada').eq('nombre', j2.nombre),
    ]);
    const calc = (rows) => {
      const r = rows || [];
      return {
        puntos:         r.reduce((a,x) => a + (x.total_jornada||0), 0),
        partidos:       r.filter(x => (x.minutos||0) > 0).length,
        titularidades:  r.filter(x => x.rol === 'titular' && (x.minutos||0) > 0).length,
        minutos:        r.reduce((a,x) => a + (x.minutos||0), 0),
        goles:          r.reduce((a,x) => a + (x.gol||0), 0),
        penaltis:       r.reduce((a,x) => a + (x.penalti||0), 0),
        asistencias:    r.reduce((a,x) => a + (x.asistencia||0), 0),
        gol_pp:         r.reduce((a,x) => a + (x.gol_pp||0), 0),
        amarillas:      r.reduce((a,x) => a + (x.amarilla||0), 0),
        doble_am:       r.reduce((a,x) => a + (x.doble_amarilla||0), 0),
        rojas:          r.reduce((a,x) => a + (x.roja||0), 0),
        goles_enc:      r.reduce((a,x) => a + (x.goles_encajados||0), 0),
        porterias_cero: r.filter(x => (x.goles_encajados||0) === 0 && (x.minutos||0) >= 60).length,
      };
    };
    const s1 = calc(r1.data);
    const s2 = calc(r2.data);
    filas = [
      ['Puntos',           s1.puntos,        s2.puntos,        s1.puntos,        s2.puntos,        'mayor'],
      ['Partidos',         s1.partidos,      s2.partidos,      s1.partidos,      s2.partidos,      'mayor'],
      ['Titularidades',    s1.titularidades, s2.titularidades, s1.titularidades, s2.titularidades, 'mayor'],
      ['Minutos',          s1.minutos,       s2.minutos,       s1.minutos,       s2.minutos,       'mayor'],
      ['Goles',
        s1.goles + (s1.penaltis > 0 ? ` (${s1.penaltis})` : ''),
        s2.goles + (s2.penaltis > 0 ? ` (${s2.penaltis})` : ''),
        s1.goles, s2.goles, 'mayor'],
      ['Asistencias',      s1.asistencias,   s2.asistencias,   s1.asistencias,   s2.asistencias,   'mayor'],
      ['Gol PP',           s1.gol_pp,        s2.gol_pp,        s1.gol_pp,        s2.gol_pp,        'menor'],
      ['Amarillas',        s1.amarillas,     s2.amarillas,     s1.amarillas,     s2.amarillas,     'menor'],
      ['Doble amarilla',   s1.doble_am,      s2.doble_am,      s1.doble_am,      s2.doble_am,      'menor'],
      ['Rojas',            s1.rojas,         s2.rojas,         s1.rojas,         s2.rojas,         'menor'],
      ['Goles encajados',  s1.goles_enc,     s2.goles_enc,     s1.goles_enc,     s2.goles_enc,     'menor'],
      ['Porterías a cero', s1.porterias_cero,s2.porterias_cero,s1.porterias_cero,s2.porterias_cero,'mayor'],
    ];
  }

  const fila = ([label, v1, v2, n1, n2, tipo]) => {
    const empate = n1 === n2;
    const gana1 = !empate && tipo !== 'none' && (tipo === 'mayor' ? n1 > n2 : n1 < n2);
    const gana2 = !empate && tipo !== 'none' && (tipo === 'mayor' ? n2 > n1 : n2 < n1);
    return `<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">
      <div style="font-family:var(--font-display);font-weight:700;font-size:14px;color:${gana1 ? 'var(--neon)' : 'var(--text)'};text-align:left">${v1}</div>
      <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;text-align:center;padding:0 10px">${label}</div>
      <div style="font-family:var(--font-display);font-weight:700;font-size:14px;color:${gana2 ? 'var(--neon)' : 'var(--text)'};text-align:right">${v2}</div>
    </div>`;
  };

  res.innerHTML = `<div style="border-top:1px solid var(--border);padding-top:16px;margin-top:4px">${filas.map(f => fila(f)).join('')}</div>`;
}

// Cerrar sugerencias al hacer click fuera
document.addEventListener('click', e => {
  [0,1].forEach(i => {
    const input = document.getElementById(`buscador-${i}`);
    const lista = document.getElementById(`sugerencias-${i}`);
    if (lista && input && !input.contains(e.target) && !lista.contains(e.target)) {
      lista.style.display = 'none';
    }
  });
});

function reiniciarComparador() {
  comparadorSeleccionados = [null, null];
  const club = document.getElementById('comp-filtro-club');
  const pos  = document.getElementById('comp-filtro-pos');
  if (club) club.value = '';
  if (pos)  pos.value  = '';
  [0,1].forEach(i => {
    const input = document.getElementById(`buscador-${i}`);
    const sel   = document.getElementById(`seleccionado-${i}`);
    const lista = document.getElementById(`sugerencias-${i}`);
    if (input) input.value = '';
    if (sel)   sel.innerHTML = '';
    if (lista) lista.style.display = 'none';
  });
  document.getElementById('resultado-comparador').innerHTML = '';
}