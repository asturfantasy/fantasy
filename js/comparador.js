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
  const filtrados = base.filter(j => q === '' || j.nombre.toLowerCase().includes(q)).slice(0, 8);
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
  const [{ data: rawJornadas }, { data: partidosFinalizados }] = await Promise.all([
    db.from('jugadores').select('total_jornada, puntos_entrenador, amarilla, doble_amarilla, roja, jornada').eq('nombre', nombre).eq('posicion', 'ENT'),
    db.from('partidos').select('jornada').eq('finalizado', true).eq('publicado', true).or(`local_abrev.eq.${club},visitante_abrev.eq.${club}`)
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

    const { data: partido } = await db.from('partidos')
      .select('resultado_local, resultado_visitante, local_abrev, visitante_abrev')
      .eq('jornada', j.jornada)
      .eq('publicado', true)
      .or(`local_abrev.eq.${club},visitante_abrev.eq.${club}`)
      .single();

    const rivalAbrev = partido ? (partido.local_abrev === club ? partido.visitante_abrev : partido.local_abrev) : null;

    const [{ data: jugClub }, { data: jugRival }] = await Promise.all([
      db.from('jugadores').select('gol, penalti_marcado').eq('club', club).eq('jornada', j.jornada).neq('posicion', 'ENT'),
      rivalAbrev ? db.from('jugadores').select('gol_pp').eq('club', rivalAbrev).eq('jornada', j.jornada).neq('posicion', 'ENT') : Promise.resolve({ data: [] })
    ]);

    if (jugClub?.length) {
      goles_favor += jugClub.reduce((a, x) => a + (x.gol || 0) + (x.penalti_marcado || 0), 0);
      goles_favor += (jugRival || []).reduce((a, x) => a + (x.gol_pp || 0), 0);
    }
    if (partido) {
      const esLocal = partido.local_abrev === club;
      goles_contra += esLocal ? (partido.resultado_visitante || 0) : (partido.resultado_local || 0);
    }
  }

  return { puntos: jornadas.reduce((a, x) => a + (x.total_jornada || 0), 0), partidos: jornadas.filter(x => x.total_jornada !== null).length, victorias, empates, derrotas, goles_favor, goles_contra, amarillas, doble_am, rojas };
}

function graficaValorComparador(valores1, valores2, nombre1, nombre2) {
  if (!valores1.length && !valores2.length) return '';
  const W = 280, H = 90, PAD = 12;
  const todosValores = [...valores1.map(d => parseFloat(d.valor)), ...valores2.map(d => parseFloat(d.valor))];
  if (!todosValores.length) return '';
  const minV = Math.min(...todosValores) - 0.2;
  const maxV = Math.max(...todosValores) + 0.2;
  const todasJornadas = [...new Set([...valores1.map(d => d.jornada), ...valores2.map(d => d.jornada)])].sort((a,b) => a-b);
  const xStep = todasJornadas.length > 1 ? (W - PAD * 2) / (todasJornadas.length - 1) : 0;
  const yScale = (v) => H - PAD - ((v - minV) / (maxV - minV)) * (H - PAD * 2);

  const lineaPath = (valores, color) => {
    const pts = todasJornadas.map((j, i) => {
      const d = valores.find(v => v.jornada === j);
      return d ? `${PAD + i * xStep},${yScale(parseFloat(d.valor))}` : null;
    }).filter(Boolean);
    if (pts.length < 2) return '';
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
      pts.map(p => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3" fill="${color}"/>`).join('');
  };

  return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--amber);letter-spacing:1px">EVOLUCIÓN DE VALOR</div>
      <div style="display:flex;align-items:center;gap:6px;margin-left:auto">
        <div style="width:20px;height:2px;background:#4cd97b;border-radius:2px"></div><span style="font-size:9px;color:var(--text-muted)">${nombre1.split(' ')[0]}</span>
        <div style="width:20px;height:2px;background:#5b9cf6;border-radius:2px;margin-left:6px"></div><span style="font-size:9px;color:var(--text-muted)">${nombre2.split(' ')[0]}</span>
      </div>
    </div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:90px">
      ${lineaPath(valores1, '#4cd97b')}
      ${lineaPath(valores2, '#5b9cf6')}
      ${todasJornadas.map((j, i) => `<text x="${PAD + i * xStep}" y="${H - 1}" text-anchor="middle" font-size="7" fill="#7a9088">J${j}</text>`).join('')}
    </svg>
  </div>`;
}

async function mostrarComparativa() {
  const res = document.getElementById('resultado-comparador');
  res.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Cargando...</div>';

  const j1 = comparadorSeleccionados[0];
  const j2 = comparadorSeleccionados[1];
  const esEnt1 = j1.posicion === 'ENT';
  const esEnt2 = j2.posicion === 'ENT';

  // Cargar valores históricos para la gráfica
  const [{ data: valoresHist1 }, { data: valoresHist2 }] = await Promise.all([
    db.from('jugadores').select('jornada, valor').eq('nombre', j1.nombre).eq('club', j1.club).order('jornada', { ascending: true }),
    db.from('jugadores').select('jornada, valor').eq('nombre', j2.nombre).eq('club', j2.club).order('jornada', { ascending: true }),
  ]);
  const valores1 = (valoresHist1 || []).filter(d => d.valor != null && parseFloat(d.valor) > 0);
  const valores2 = (valoresHist2 || []).filter(d => d.valor != null && parseFloat(d.valor) > 0);

  let filas = [];
  let stats1, stats2;

  if (esEnt1 || esEnt2) {
    const [s1, s2] = await Promise.all([
      esEnt1 ? calcStatsEntrenador(j1.nombre, j1.club) : null,
      esEnt2 ? calcStatsEntrenador(j2.nombre, j2.club) : null,
    ]);
    const e1 = s1 || { puntos:0, partidos:0, victorias:0, empates:0, derrotas:0, goles_favor:0, goles_contra:0, amarillas:0, doble_am:0, rojas:0 };
    const e2 = s2 || { puntos:0, partidos:0, victorias:0, empates:0, derrotas:0, goles_favor:0, goles_contra:0, amarillas:0, doble_am:0, rojas:0 };
    stats1 = e1; stats2 = e2;
    filas = [
      ['Puntos',          e1.puntos,       e2.puntos,       e1.puntos,       e2.puntos,       'mayor'],
      ['Partidos',        e1.partidos,     e2.partidos,     e1.partidos,     e2.partidos,     'mayor'],
      ['Victorias',       e1.victorias,    e2.victorias,    e1.victorias,    e2.victorias,    'mayor'],
      ['Empates',         e1.empates,      e2.empates,      e1.empates,      e2.empates,      'none'],
      ['Derrotas',        e1.derrotas,     e2.derrotas,     e1.derrotas,     e2.derrotas,     'menor'],
      ['Goles a favor',   e1.goles_favor,  e2.goles_favor,  e1.goles_favor,  e2.goles_favor,  'mayor'],
      ['Goles en contra', e1.goles_contra, e2.goles_contra, e1.goles_contra, e2.goles_contra, 'menor'],
      ['Amarillas',       e1.amarillas,    e2.amarillas,    e1.amarillas,    e2.amarillas,    'menor'],
      ['Doble amarilla',  e1.doble_am,     e2.doble_am,     e1.doble_am,     e2.doble_am,     'menor'],
      ['Rojas',           e1.rojas,        e2.rojas,        e1.rojas,        e2.rojas,        'menor'],
    ];
  } else {
    const [r1, r2] = await Promise.all([
      db.from('jugadores').select('minutos,rol,gol,penalti_marcado,penalti_fallado,asistencia,gol_pp,amarilla,doble_amarilla,roja,goles_encajados,total_jornada').eq('nombre', j1.nombre),
      db.from('jugadores').select('minutos,rol,gol,penalti_marcado,penalti_fallado,asistencia,gol_pp,amarilla,doble_amarilla,roja,goles_encajados,total_jornada').eq('nombre', j2.nombre),
    ]);
    const calc = (rows) => {
      const r = rows || [];
      const goles = r.reduce((a,x) => a + (x.gol||0), 0);
      const penMarcados = r.reduce((a,x) => a + (x.penalti_marcado||0), 0);
      const penFallados = r.reduce((a,x) => a + (x.penalti_fallado||0), 0);
      return {
        puntos:         r.reduce((a,x) => a + (x.total_jornada||0), 0),
        partidos:       r.filter(x => (x.minutos||0) > 0).length,
        titularidades:  r.filter(x => x.rol === 'titular' && (x.minutos||0) > 0).length,
        minutos:        r.reduce((a,x) => a + (x.minutos||0), 0),
        goles, penMarcados, penFallados,
        totalGoles:     goles + penMarcados,
        asistencias:    r.reduce((a,x) => a + (x.asistencia||0), 0),
        gol_pp:         r.reduce((a,x) => a + (x.gol_pp||0), 0),
        amarillas:      r.reduce((a,x) => a + (x.amarilla||0), 0),
        doble_am:       r.reduce((a,x) => a + (x.doble_amarilla||0), 0),
        rojas:          r.reduce((a,x) => a + (x.roja||0), 0),
        goles_enc:      r.reduce((a,x) => a + (x.goles_encajados||0), 0),
        porterias_cero: r.filter(x => (x.goles_encajados||0) === 0 && (x.minutos||0) >= 60).length,
      };
    };
    stats1 = calc(r1.data);
    stats2 = calc(r2.data);

    const goles1 = stats1.totalGoles + (stats1.penMarcados > 0 ? ` (${stats1.penMarcados})` : '');
    const goles2 = stats2.totalGoles + (stats2.penMarcados > 0 ? ` (${stats2.penMarcados})` : '');

    filas = [
      ['Puntos',           stats1.puntos,        stats2.puntos,        stats1.puntos,        stats2.puntos,        'mayor'],
      ['Partidos',         stats1.partidos,      stats2.partidos,      stats1.partidos,      stats2.partidos,      'mayor'],
      ['Titularidades',    stats1.titularidades, stats2.titularidades, stats1.titularidades, stats2.titularidades, 'mayor'],
      ['Minutos',          stats1.minutos,       stats2.minutos,       stats1.minutos,       stats2.minutos,       'mayor'],
      ['Goles',            goles1,               goles2,               stats1.totalGoles,    stats2.totalGoles,    'mayor'],
      ['Pen. fallados',    stats1.penFallados,   stats2.penFallados,   stats1.penFallados,   stats2.penFallados,   'menor'],
      ['Asistencias',      stats1.asistencias,   stats2.asistencias,   stats1.asistencias,   stats2.asistencias,   'mayor'],
      ['Gol PP',           stats1.gol_pp,        stats2.gol_pp,        stats1.gol_pp,        stats2.gol_pp,        'menor'],
      ['Amarillas',        stats1.amarillas,     stats2.amarillas,     stats1.amarillas,     stats2.amarillas,     'menor'],
      ['Doble amarilla',   stats1.doble_am,      stats2.doble_am,      stats1.doble_am,      stats2.doble_am,      'menor'],
      ['Rojas',            stats1.rojas,         stats2.rojas,         stats1.rojas,         stats2.rojas,         'menor'],
      ['Goles encajados',  stats1.goles_enc,     stats2.goles_enc,     stats1.goles_enc,     stats2.goles_enc,     'menor'],
      ['Porterías a cero', stats1.porterias_cero,stats2.porterias_cero,stats1.porterias_cero,stats2.porterias_cero,'mayor'],
    ];
  }

  window._comparadorData = { j1, j2, filas, stats1, stats2 };

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

  res.innerHTML = `
    <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:4px">
      ${filas.map(f => fila(f)).join('')}
    </div>
    ${graficaValorComparador(valores1, valores2, j1.nombre, j2.nombre)}
    <button onclick="exportarComparador()" style="width:100%;margin-top:16px;padding:10px;background:var(--green-brand);color:white;border:none;border-radius:10px;font-family:var(--font-display);font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
      <i class="ti ti-share"></i> Compartir comparativa
    </button>`;
}

async function exportarComparador() {
  const { j1, j2, filas } = window._comparadorData;
  const posColor = { POR:'#e3b341', DEF:'#5b9cf6', MED:'#4cd97b', DEL:'#f05e5e', ENT:'#a78bfa' };

  const avatar = (j) =>
    j.foto_url
      ? `<img src="${j.foto_url}" width="40" height="40" style="object-fit:cover;border-radius:50%;width:100%;height:100%">`
      : `<span style="font-size:14px;font-weight:700;color:white">${j.nombre.substring(0,2).toUpperCase()}</span>`;

  const tarjeta = document.createElement('div');
  tarjeta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:360px;background:#111816;border-radius:16px;overflow:hidden;font-family:Space Grotesk,sans-serif;padding:20px;border:1px solid rgba(76,217,123,0.2)';

  tarjeta.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">' +
      '<img src="https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/logo_asturfantasy_redondo.png" width="24" height="24" style="border-radius:6px">' +
      '<span style="color:white;font-weight:700;font-size:13px">Astur<span style="color:#4cd97b">Fantasy</span></span>' +
      '<span style="margin-left:auto;font-size:11px;color:rgba(255,255,255,0.5)">Comparador</span>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">' +
      [j1, j2].map(j =>
        '<div style="background:#1a2420;border-radius:10px;padding:12px;text-align:center">' +
          '<div style="width:44px;height:44px;border-radius:50%;background:' + (posColor[j.posicion] || '#243028') + ';margin:0 auto 6px;display:flex;align-items:center;justify-content:center;overflow:hidden">' +
            avatar(j) +
          '</div>' +
          '<div style="font-size:12px;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + j.nombre + '</div>' +
          '<div style="font-size:9px;color:#7a9088">' + j.posicion + ' · ' + j.club + '</div>' +
        '</div>'
      ).join('') +
    '</div>' +
    '<div style="display:flex;flex-direction:column;gap:0">' +
      filas.map(([label, v1, v2, n1, n2, tipo]) => {
        const empate = n1 === n2;
        const gana1 = !empate && tipo !== 'none' && (tipo === 'mayor' ? n1 > n2 : n1 < n2);
        const gana2 = !empate && tipo !== 'none' && (tipo === 'mayor' ? n2 > n1 : n2 < n1);
        return '<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06)">' +
          '<div style="font-size:13px;font-weight:700;color:' + (gana1 ? '#4cd97b' : 'white') + ';text-align:left">' + v1 + '</div>' +
          '<div style="font-size:8px;color:#7a9088;text-transform:uppercase;letter-spacing:1px;text-align:center;padding:0 8px">' + label + '</div>' +
          '<div style="font-size:13px;font-weight:700;color:' + (gana2 ? '#4cd97b' : 'white') + ';text-align:right">' + v2 + '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<div style="margin-top:14px;text-align:center;font-size:10px;color:#4a5e58">asturfantasy.com</div>';

  document.body.appendChild(tarjeta);
  try {
    const canvas = await html2canvas(tarjeta, { backgroundColor: '#111816', scale: 2, useCORS: true });
    document.body.removeChild(tarjeta);
    canvas.toBlob(async blob => {
      const file = new File([blob], j1.nombre + '_vs_' + j2.nombre + '.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: j1.nombre + ' vs ' + j2.nombre + ' · AsturFantasy' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = j1.nombre + '_vs_' + j2.nombre + '.png'; a.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch(e) {
    if (document.body.contains(tarjeta)) document.body.removeChild(tarjeta);
    showToast('Error al compartir');
  }
}

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