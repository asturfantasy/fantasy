/* ============================================================
   js/lineup.js  —  Alineación
   ============================================================ */

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

document.getElementById('btn-export-png')?.addEventListener('click', exportarAlineacion);
