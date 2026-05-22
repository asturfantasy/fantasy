/* ============================================================
   js/ranking.js  —  Clasificación, jugadores, once y rentable
   ============================================================ */

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
  }

  // General — métricas rápidas
  const { data: general } = await db.from('clasificacion_general_auto').select('*');
  if (general?.length) {
    const miPosG = general.findIndex(r => r.user_id === currentUser?.id);
    const mpG = document.getElementById('metric-pos-general');
    if (mpG) mpG.textContent = miPosG >= 0 ? (miPosG + 1) + 'º' : '—';
  }

  // Semanal — métrica rápida
  const { data: semanalMetrica } = await db.from('clasificacion_automatica').select('puntos, user_id').eq('jornada', jornadaRanking).order('puntos', { ascending: false });
  if (semanalMetrica?.length) {
    const miPosS = semanalMetrica.findIndex(r => r.user_id === currentUser?.id);
    const mpS = document.getElementById('metric-pos-jornada');
    if (mpS) mpS.textContent = miPosS >= 0 ? (miPosS + 1) + 'º' : '—';
  }

  // Peña — métrica rápida
  if (equipoFav) {
    const { data: penaAll } = await db.from('clasificacion_general_auto').select('*');
    const { data: equiposFav } = await db.from('equipos').select('user_id').eq('equipo_favorito', equipoFav);
    const userIdsFav = new Set((equiposFav || []).map(e => e.user_id));
    const penaFiltrada = (penaAll || []).filter(r => userIdsFav.has(r.user_id));
    const miPosP = penaFiltrada.findIndex(r => r.user_id === currentUser?.id);
    const mpP = document.getElementById('metric-pos-pena');
    if (mpP) mpP.textContent = miPosP >= 0 ? (miPosP + 1) + 'º' : '—';
  }
}

async function loadRankingClasificacion() {
  const jornadaRanking = jornadadCerrada() ? JORNADA_ACTIVA : JORNADA_VISIBLE;

  // General
  const { data: general } = await db.from('clasificacion_general_auto').select('*');
  const tbodyG = document.getElementById('ranking-general-body');
  if (!general?.length) {
    tbodyG.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:28px">Sin datos</td></tr>';
  } else {
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
      tbody.innerHTML = semanal.map((r, i) => {
        const esYo = r.user_id === currentUser?.id;
        return '<tr class="' + medalClass(i+1) + '" style="' + (esYo ? 'outline:2px solid var(--neon);outline-offset:-2px;' : '') + '"><td><span class="rank-pos ' + medalClass(i+1) + '">' + (i+1) + '</span></td><td><div class="rank-team">' + (esYo ? '⭐ ' : '') + r.nombre_equipo + '</div></td><td><div style="display:flex;align-items:center;gap:8px;justify-content:flex-end"><div class="rank-pts">' + r.puntos + '</div>' + (esYo ? '<button onclick="compartirClasificacion(\'' + r.nombre_equipo + '\',' + (i+1) + ',' + r.puntos + ',\'jornada\')" style="background:var(--neon);color:#0d1117;border:none;border-radius:20px;padding:4px 10px;cursor:pointer;font-family:var(--font-display);font-weight:700;font-size:10px;white-space:nowrap">COMPARTIR</button>' : '') + '</div></td></tr>';
      }).join('');
    }
  };
  const selectSemanal = document.getElementById('semanal-jornada-select');
  if (selectSemanal) {
    selectSemanal.innerHTML = '';
    for (let i = JORNADA_ACTIVA; i >= 1; i--) { const opt = document.createElement('option'); opt.value = i; opt.textContent = 'Jornada ' + i; selectSemanal.appendChild(opt); }
    selectSemanal.value = jornadaRanking;
    cargarSemanal(jornadaRanking);
    selectSemanal.onchange = e => cargarSemanal(parseInt(e.target.value));
  }

  // Peña
  const { data: equipoData } = await db.from('equipos').select('equipo_favorito').eq('user_id', currentUser.id).single();
  const equipoFav = equipoData?.equipo_favorito;
  const clubInfo = CLUBES_INFO[equipoFav] || null;
  if (clubInfo) {
    const esc = document.getElementById('pena-escudo');
    const nom = document.getElementById('pena-nombre');
    if (esc) { esc.src = clubInfo.escudo; esc.style.display = 'block'; }
    if (nom) nom.textContent = 'Liga ' + clubInfo.nombre;
  }
  if (equipoFav) {
    const { data: penaAll } = await db.from('clasificacion_general_auto').select('*');
    const { data: equiposFav } = await db.from('equipos').select('user_id').eq('equipo_favorito', equipoFav);
    const userIdsFav = new Set((equiposFav || []).map(e => e.user_id));
    const penaFiltrada = (penaAll || []).filter(r => userIdsFav.has(r.user_id));
    const tbodyP = document.getElementById('ranking-pena-body');
    if (tbodyP) {
      tbodyP.innerHTML = !penaFiltrada.length
        ? '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:28px">Solo tú en esta peña de momento</td></tr>'
        : penaFiltrada.map((r, i) => {
            const esYo = r.user_id === currentUser?.id;
            return '<tr class="' + medalClass(i+1) + '" style="' + (esYo ? 'outline:2px solid var(--neon);outline-offset:-2px;' : '') + '"><td><span class="rank-pos ' + medalClass(i+1) + '">' + (i+1) + '</span></td><td><div class="rank-team">' + (esYo ? '⭐ ' : '') + r.nombre_equipo + '</div></td><td><div style="display:flex;align-items:center;gap:8px;justify-content:flex-end"><div class="rank-pts">' + r.puntos_total + '</div>' + (esYo ? '<button onclick="compartirClasificacion(\'' + r.nombre_equipo + '\',' + (i+1) + ',' + r.puntos_total + ',\'pena\',\'' + equipoFav + '\')" style="background:var(--neon);color:#0d1117;border:none;border-radius:20px;padding:4px 10px;cursor:pointer;font-family:var(--font-display);font-weight:700;font-size:10px;white-space:nowrap">COMPARTIR</button>' : '') + '</div></td></tr>';
          }).join('');
    }
  }
}

async function compartirClasificacion(nombreEquipo, posicion, puntos, tipo, club) {
  const emoji = posicion === 1 ? '🥇' : posicion === 2 ? '🥈' : posicion === 3 ? '🥉' : '⚽';
  let texto;
  if (tipo === 'jornada') {
    texto = emoji + ' ¡He quedado ' + posicion + 'º esta jornada en AsturFantasy con ' + puntos + ' puntos!\n🏆 Equipo: ' + nombreEquipo + '\nasturfantasy.com';
  } else if (tipo === 'pena') {
    const nombreClub = CLUBES_INFO[club]?.nombre || club || 'tu club';
    texto = emoji + ' ¡Voy ' + posicion + 'º en la liga de fans del ' + nombreClub + ' en AsturFantasy!\n🏆 Equipo: ' + nombreEquipo + ' · ' + puntos + ' pts\nasturfantasy.com';
  } else {
    texto = emoji + ' ¡Voy ' + posicion + 'º en la clasificación general de AsturFantasy con ' + puntos + ' puntos!\n🏆 Equipo: ' + nombreEquipo + '\nasturfantasy.com';
  }
  if (navigator.share) await navigator.share({ text: texto });
  else { await navigator.clipboard.writeText(texto); showToast('Copiado al portapapeles'); }
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
      <select id="filtro-orden" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:7px 10px;font-family:var(--font-display);font-size:13px;cursor:pointer">
        <option value="puntos">Ordenar por puntos</option>
        <option value="valor-asc">Valor ↑</option>
        <option value="valor-desc">Valor ↓</option>
        <option value="rentabilidad">Rentabilidad</option>
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
    const orden = document.getElementById('filtro-orden').value;
    const filtrados = (jugadores || []).filter(j =>
      (!club || j.club === club) && (!pos || j.posicion === pos) && (!nombre || j.nombre.toLowerCase().includes(nombre))
    ).sort((a, b) => {
      if (orden === 'valor-asc') return (parseFloat(a.valor) || 0) - (parseFloat(b.valor) || 0);
      if (orden === 'valor-desc') return (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0);
      if (orden === 'rentabilidad') return (b.puntos_total / (parseFloat(b.valor) || 1)) - (a.puntos_total / (parseFloat(a.valor) || 1));
      return b.puntos_total - a.puntos_total;
    });
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
  document.getElementById('filtro-orden').addEventListener('change', renderJugadoresFn);
  document.getElementById('filtro-nombre').addEventListener('input', renderJugadoresFn);
  document.getElementById('btn-reset-filtros').addEventListener('click', () => {
    document.getElementById('filtro-club').value = '';
    document.getElementById('filtro-pos').value = '';
    document.getElementById('filtro-orden').value = 'puntos';
    document.getElementById('filtro-nombre').value = '';
    paginaActual = 1; renderJugadoresFn();
  });
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
  const { data, error } = await db.from('jugadores').select('nombre, club, posicion, puntos, valor, escudo_url, foto_url').eq('jornada', jornada).neq('posicion', 'ENT').gt('valor', 0).gt('puntos', 0).order('puntos', { ascending: false });
  if (error || !data?.length) { container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--text-muted)">Sin datos para esta jornada</div>'; return; }
  const conRentabilidad = data.map(j => ({ ...j, rentabilidad: j.puntos / j.valor }));
  const porPos = { POR:[], DEF:[], MED:[], DEL:[] };
  conRentabilidad.forEach(j => porPos[j.posicion]?.push(j));
  Object.keys(porPos).forEach(pos => porPos[pos].sort((a, b) => b.rentabilidad - a.rentabilidad));
  const portero = porPos.POR.slice(0, 1);
  const defs = porPos.DEF, meds = porPos.MED, dels = porPos.DEL;
  let defOnce = defs.slice(0, 3), medOnce = meds.slice(0, 3), delOnce = dels.slice(0, 1);
  const candidatos = [...defs.slice(3,5).map(j=>({...j,_pos:'DEF'})),...meds.slice(3,4).map(j=>({...j,_pos:'MED'})),...dels.slice(1,3).map(j=>({...j,_pos:'DEL'}))].sort((a,b)=>b.rentabilidad-a.rentabilidad);
  let huecos = 3;
  for (const c of candidatos) {
    if (!huecos) break;
    if (c._pos==='DEF' && defOnce.length<5) { defOnce.push(c); huecos--; }
    else if (c._pos==='MED' && medOnce.length<4) { medOnce.push(c); huecos--; }
    else if (c._pos==='DEL' && delOnce.length<3) { delOnce.push(c); huecos--; }
  }
  const filas = [{ label:'🧤 PORTERO',jugadores:portero },{ label:'🛑 DEFENSAS',jugadores:defOnce },{ label:'🧠 MEDIOS',jugadores:medOnce },{ label:'⚽ DELANTEROS',jugadores:delOnce }];
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
