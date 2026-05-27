/* ============================================================
   js/myteam.js  —  Mi equipo
   ============================================================ */

async function mostrarDesgloseMyTeam(jugadorId, nombre, posicion, jornada) {
  if (!jornada) jornada = JORNADA_VISIBLE;
  const modal = document.getElementById('modal-desglose');
  const content = document.getElementById('desglose-content');
  document.getElementById('desglose-titulo').textContent = nombre;
  modal.classList.add('open');
  const { data, error } = await db.from('jugadores').select('minutos, puerta_cero, lne, gol, asistencia, penalti, gol_pp, amarilla, doble_amarilla, roja, total_jornada, puntos_entrenador, goles_encajados').eq('id', jugadorId).eq('jornada', jornada).single();
  if (error || !data) { content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin datos</div>'; return; }
  const items = desgloseFn({ ...data, posicion, nombre });
  content.innerHTML = items.map(item => '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-family:var(--font-body);font-size:13px;color:var(--text-muted)">' + item.label + '</span><span style="font-family:var(--font-display);font-weight:700;font-size:15px;color:' + (item.pts >= 0 ? 'var(--neon)' : 'var(--red)') + '">' + (item.pts > 0 ? '+' : '') + item.pts + '</span></div>').join('') +
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;margin-top:4px"><span style="font-family:var(--font-display);font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:var(--text)">Total</span><span style="font-family:var(--font-display);font-weight:700;font-size:24px;color:var(--neon)">' + data.total_jornada + '</span></div>' +
    '<button onclick="compartirDesglose()" style="width:100%;margin-top:12px;padding:10px;background:var(--green-brand);color:white;border:none;border-radius:10px;font-family:var(--font-display);font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px"><i class="ti ti-share"></i> Compartir puntuación</button>';
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

const btnGuardar = document.getElementById('btn-guardar-equipo');
if (btnGuardar) {
  btnGuardar.removeEventListener('click', guardarNombreEquipo);
  btnGuardar.addEventListener('click', guardarNombreEquipo);
}
