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
  const ambosPor = j1.posicion === 'POR' && j2.posicion === 'POR';

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
      db.from('jugadores').select('minutos,rol,gol,penalti_marcado,penalti_fallado,penalti_parado,asistencia,gol_pp,amarilla,doble_amarilla,roja,goles_encajados,total_jornada').eq('nombre', j1.nombre),
      db.from('jugadores').select('minutos,rol,gol,penalti_marcado,penalti_fallado,penalti_parado,asistencia,gol_pp,amarilla,doble_amarilla,roja,goles_encajados,total_jornada').eq('nombre', j2.nombre),
    ]);

    const calc = (rows) => {
      const r = rows || [];
      const goles = r.reduce((a,x) => a + (x.gol||0), 0);
      const penMarcados = r.reduce((a,x) => a + (x.penalti_marcado||0), 0);
      const penFallados = r.reduce((a,x) => a + (x.penalti_fallado||0), 0);
      const penParados = r.reduce((a,x) => a + (x.penalti_parado||0), 0);
      return {
        puntos:         r.reduce((a,x) => a + (x.total_jornada||0), 0),
        partidos:       r.filter(x => (x.minutos||0) > 0).length,
        titularidades:  r.filter(x => x.rol === 'titular' && (x.minutos||0) > 0).length,
        minutos:        r.reduce((a,x) => a + (x.minutos||0), 0),
        goles, penMarcados, penFallados, penParados,
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
      ambosPor
        ? ['Pen. parados',  stats1.penParados,  stats2.penParados,  stats1.penParados,  stats2.penParados,  'mayor']
        : ['Pen. fallados', stats1.penFallados, stats2.penFallados, stats1.penFallados, stats2.penFallados, 'menor'],
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

  const SIZE = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#101715';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const cargarImg = (url) => new Promise(res => {
    if (!url) { res(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = url;
  });

  // ── Header ──
  ctx.font = 'bold 36px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('ASTUR', 40, 55);
  ctx.fillStyle = '#007a45';
  ctx.fillText('FANTASY', 40 + ctx.measureText('ASTUR').width, 55);

  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Comparador', SIZE - 40, 55);

  const gradH = ctx.createLinearGradient(0, 0, SIZE, 0);
  gradH.addColorStop(0, 'transparent');
  gradH.addColorStop(0.5, 'rgba(0,122,69,0.5)');
  gradH.addColorStop(1, 'transparent');
  ctx.strokeStyle = gradH;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 90);
  ctx.lineTo(SIZE, 90);
  ctx.stroke();

  // ── Cards jugadores ──
  const CARD_Y = 110;
  const CARD_W = (SIZE - 80) / 2;
  const CARD_H = 160;
  const r = 50;

  const dibujarJugador = async (j, x) => {
    const fotoImg   = await cargarImg(j.foto_url);
    const escudoImg = await cargarImg(j.escudo_url);

    ctx.fillStyle = '#007a45';
    ctx.beginPath();
    ctx.roundRect(x, CARD_Y, CARD_W, CARD_H, 12);
    ctx.fill();

    const cx = x + CARD_W / 2;
    const cy = CARD_Y + 14 + r;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    if (fotoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(fotoImg, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(j.nombre.substring(0,2).toUpperCase(), cx, cy);
    }

    if (escudoImg) {
      const er = 18;
      const ex = cx + r - er + 2;
      const ey = cy + r - er + 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.clip();
      ctx.drawImage(escudoImg, ex - er, ey - er, er * 2, er * 2);
      ctx.restore();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(j.nombre, cx, CARD_Y + 14 + r * 2 + 10);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '13px monospace';
    ctx.fillText(j.posicion + ' · ' + j.club, cx, CARD_Y + 14 + r * 2 + 34);
  };

  await dibujarJugador(j1, 40);
  await dibujarJugador(j2, SIZE / 2 + 4);

  // ── Filas comparación ──
  const FILAS_Y = CARD_Y + CARD_H + 20;
  const AVAILABLE_H = SIZE - FILAS_Y - 60;
  const ROW_H = Math.floor(AVAILABLE_H / filas.length);
  const FILA_H = ROW_H - 6;

  filas.forEach(([label, v1, v2, n1, n2, tipo], i) => {
    const y = FILAS_Y + i * ROW_H;
    const empate = n1 === n2;
    const gana1 = !empate && tipo !== 'none' && (tipo === 'mayor' ? n1 > n2 : n1 < n2);
    const gana2 = !empate && tipo !== 'none' && (tipo === 'mayor' ? n2 > n1 : n2 < n1);

    ctx.fillStyle = i % 2 === 0 ? '#0e1512' : '#101715';
    ctx.beginPath();
    ctx.roundRect(16, y, SIZE - 32, FILA_H, 8);
    ctx.fill();

    // Valor j1
    ctx.fillStyle = gana1 ? '#00d97e' : '#ffffff';
    ctx.font = `bold ${Math.floor(FILA_H * 0.48)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(v1, 32, y + FILA_H / 2);

    // Label centro
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `${Math.floor(FILA_H * 0.32)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(label.toUpperCase(), SIZE / 2, y + FILA_H / 2);

    // Valor j2
    ctx.fillStyle = gana2 ? '#00d97e' : '#ffffff';
    ctx.font = `bold ${Math.floor(FILA_H * 0.48)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(v2, SIZE - 32, y + FILA_H / 2);
  });

  // ── Footer ──
  const footerY = SIZE - 52;
  const gradF = ctx.createLinearGradient(0, 0, SIZE, 0);
  gradF.addColorStop(0, 'transparent');
  gradF.addColorStop(0.5, 'rgba(0,122,69,0.4)');
  gradF.addColorStop(1, 'transparent');
  ctx.strokeStyle = gradF;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(SIZE, footerY);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('asturfantasy.com', SIZE / 2, footerY + 26);

  canvas.toBlob(async blob => {
    const file = new File([blob], `${j1.nombre}_vs_${j2.nombre}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `${j1.nombre} vs ${j2.nombre} · AsturFantasy` });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${j1.nombre}_vs_${j2.nombre}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
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