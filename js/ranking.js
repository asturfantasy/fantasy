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
  // Al final de loadRanking():
  cargarMVPPreview(jornadaRanking);
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
    const cerrada = jornadaSel < JORNADA_ACTIVA;
    if (!semanal?.length) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:28px">Sin datos para la jornada ' + jornadaSel + '</td></tr>';
    } else {
      tbody.innerHTML = semanal.map((r, i) => {
        const esYo = r.user_id === currentUser?.id;
        const clickable = cerrada ? 'cursor:pointer' : '';
        const onclick = cerrada ? 'onclick="verAlineacionUsuario(\'' + r.user_id + '\',\'' + r.nombre_equipo + '\',' + jornadaSel + ')"' : '';
        return '<tr class="' + medalClass(i+1) + '" style="' + (esYo ? 'outline:2px solid var(--neon);outline-offset:-2px;' : '') + clickable + '" ' + onclick + '><td><span class="rank-pos ' + medalClass(i+1) + '">' + (i+1) + '</span></td><td><div class="rank-team">' + (esYo ? '⭐ ' : '') + r.nombre_equipo + '</div>' + (cerrada ? '<div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-top:2px">Ver alineación →</div>' : '') + '</td><td><div style="display:flex;align-items:center;gap:8px;justify-content:flex-end"><div class="rank-pts">' + r.puntos + '</div>' + (esYo ? '<button onclick="event.stopPropagation();compartirClasificacion(\'' + r.nombre_equipo + '\',' + (i+1) + ',' + r.puntos + ',\'jornada\')" style="background:var(--neon);color:#0d1117;border:none;border-radius:20px;padding:4px 10px;cursor:pointer;font-family:var(--font-display);font-weight:700;font-size:10px;white-space:nowrap">COMPARTIR</button>' : '') + '</div></td></tr>';
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

async function verAlineacionUsuario(userId, nombreEquipo, jornada) {
  const modal = document.getElementById('modal-historial');
  const content = document.getElementById('historial-content');
  document.getElementById('historial-titulo').textContent = nombreEquipo;
  content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Cargando...</div>';
  modal.classList.add('open');

  const { data, error } = await db.from('mi_equipo_detalle')
    .select('*')
    .eq('user_id', userId)
    .eq('jornada', jornada)
    .order('posicion');

  if (error || !data?.length) {
    content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin alineación para esta jornada</div>';
    return;
  }

  const [{ data: capData }, { data: jugData }] = await Promise.all([
    db.from('mi_equipo').select('jugador_id').eq('user_id', userId).eq('jornada', jornada).eq('capitan', true).single(),
    db.from('jugadores').select('id, foto_url, escudo_url').in('id', data.map(j => j.jugador_id)).eq('jornada', jornada)
  ]);

  const capitanId = capData?.jugador_id || null;
  const fotoMap = {}, escudoMap = {};
  (jugData || []).forEach(j => { fotoMap[j.id] = j.foto_url; escudoMap[j.id] = j.escudo_url; });

  const orden = ['POR','DEF','MED','DEL','ENT'];
  const sorted = [...data].sort((a,b) => orden.indexOf(a.posicion) - orden.indexOf(b.posicion));
  const totalPuntos = sorted.reduce((acc, j) => acc + (j.jugador_id === capitanId ? (j.puntos||0) * 2 : (j.puntos||0)), 0);
  const totalValor = sorted.reduce((acc, j) => acc + (parseFloat(j.valor) || 0), 0).toFixed(1);
  const formacion = data[0]?.formacion || '—';

  const posColor = { POR:'var(--pos-gk)', DEF:'var(--pos-def)', MED:'var(--pos-mid)', DEL:'var(--pos-fwd)', ENT:'var(--pos-ent)' };

  content.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--border)">' +
      '<div>' +
        '<div style="font-family:var(--font-display);font-size:13px;color:var(--text-muted)">Formación: <strong style="color:var(--text)">' + formacion + '</strong></div>' +
        '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:2px">Jornada ' + jornada + '</div>' +
      '</div>' +
      '<div style="text-align:right">' +
        '<div style="font-family:var(--font-display);font-weight:800;font-size:28px;color:var(--neon);line-height:1">' + totalPuntos + '</div>' +
        '<div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);letter-spacing:1px">PTS</div>' +
        '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:4px">Valor: <strong style="color:var(--amber)">' + totalValor + 'M</strong></div>' +
      '</div>' +
    '</div>' +
    sorted.map(j => {
      const esC = j.jugador_id === capitanId;
      const pts = esC ? (j.puntos||0) * 2 : (j.puntos||0);
      const foto = fotoMap[j.jugador_id];
      const escudo = escudoMap[j.jugador_id];
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">' +
        '<div style="width:36px;height:36px;border-radius:50%;background:' + (posColor[j.posicion]||'var(--surface)') + ';display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:11px;font-weight:700;color:#111816;flex-shrink:0;position:relative;overflow:hidden">' +
          (foto ? '<img loading="lazy" src="' + foto + '" width="36" height="36" style="object-fit:cover;border-radius:50%">' : j.posicion) +
          (escudo ? '<img loading="lazy" src="' + escudo + '" width="14" height="14" style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;border-radius:50%;background:white;border:1px solid rgba(0,0,0,0.2)">' : '') +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-family:var(--font-display);font-weight:600;font-size:13px;color:var(--text)">' + j.nombre + (esC ? ' ⭐' : '') + '</div>' +
          '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">' + j.club + (esC ? ' · Cap.' : '') + ' · <span style="color:var(--amber)">' + (parseFloat(j.valor) || 0) + 'M</span></div>' +
        '</div>' +
        '<div style="font-family:var(--font-display);font-weight:700;font-size:18px;color:var(--neon)">' + pts + '</div>' +
      '</div>';
    }).join('');
}

/* ============================================================
   MVP de la jornada — añadir a ranking.js
   ============================================================ */

async function loadMVP() {
  const jornadaActual = jornadadCerrada() ? JORNADA_ACTIVA : JORNADA_VISIBLE;
  const selectMVP = document.getElementById('mvp-jornada-select');

  if (selectMVP && !selectMVP.options.length) {
    for (let i = jornadaActual; i >= 1; i--) {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = 'Jornada ' + i;
      selectMVP.appendChild(opt);
    }
    selectMVP.value = jornadaActual;
    selectMVP.addEventListener('change', e => cargarMVP(parseInt(e.target.value)));
  }

  await cargarMVP(jornadaActual);
  cargarMVPPreview(jornadaActual);
}

async function cargarMVPPreview(jornada) {
  const preview = document.getElementById('mvp-preview');
  if (!preview) return;

  const { data: partidosPublicados } = await db.from('partidos')
    .select('jornada, local_abrev, visitante_abrev')
    .eq('jornada', jornada)
    .eq('publicado', true);

  if (!partidosPublicados?.length) {
    preview.innerHTML = '<div style="color:var(--text-muted);font-family:var(--font-mono);font-size:11px">Sin datos</div>';
    return;
  }

  const clubsPublicados = new Set();
  partidosPublicados.forEach(p => { clubsPublicados.add(p.local_abrev); clubsPublicados.add(p.visitante_abrev); });

  const { data: jugadores } = await db.from('jugadores')
    .select('nombre, club, posicion, puntos, minutos, foto_url, escudo_url')
    .eq('jornada', jornada)
    .order('puntos', { ascending: false })
    .order('minutos', { ascending: true })
    .order('asistencia', { ascending: false });

  const mvp = (jugadores || []).find(j => clubsPublicados.has(j.club) && (j.minutos || 0) > 0);
  if (!mvp) { preview.innerHTML = '<div style="color:var(--text-muted);font-family:var(--font-mono);font-size:11px">Sin datos</div>'; return; }

  const posColor = { POR:'var(--pos-gk)', DEF:'var(--pos-def)', MED:'var(--pos-mid)', DEL:'var(--pos-fwd)', ENT:'var(--pos-ent)' };

  preview.innerHTML =
    '<div style="width:48px;height:48px;border-radius:50%;background:' + (posColor[mvp.posicion]||'var(--surface)') + ';display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:16px;font-weight:700;color:#111816;flex-shrink:0;overflow:hidden">' +
      (mvp.foto_url ? '<img src="' + mvp.foto_url + '" width="48" height="48" style="object-fit:cover;border-radius:50%">' : mvp.nombre.substring(0,2).toUpperCase()) +
    '</div>' +
    '<div style="flex:1;min-width:0">' +
      '<div style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + mvp.nombre + '</div>' +
      '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">' + mvp.posicion + ' · ' + mvp.club + ' · J' + jornada + '</div>' +
    '</div>' +
    '<div style="text-align:right;flex-shrink:0">' +
      '<div style="font-family:var(--font-display);font-weight:900;font-size:28px;color:var(--neon);line-height:1">' + mvp.puntos + '</div>' +
      '<div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);letter-spacing:1px">PTS</div>' +
    '</div>';
}

async function cargarMVP(jornada) {
  const container = document.getElementById('mvp-container');
  container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--text-muted)">Cargando...</div>';

  const { data: partidosPublicados } = await db.from('partidos')
    .select('jornada, local_abrev, visitante_abrev')
    .eq('jornada', jornada)
    .eq('publicado', true);

  if (!partidosPublicados?.length) {
    container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--text-muted)">Sin datos para esta jornada</div>';
    return;
  }

  const clubsPublicados = new Set();
  partidosPublicados.forEach(p => { clubsPublicados.add(p.local_abrev); clubsPublicados.add(p.visitante_abrev); });

  const { data: jugadores } = await db.from('jugadores')
    .select('nombre, club, posicion, puntos, minutos, gol, penalti_marcado, asistencia, amarilla, roja, goles_encajados, foto_url, escudo_url, valor')
    .eq('jornada', jornada)
    .order('puntos', { ascending: false })
    .order('minutos', { ascending: true })
    .order('asistencia', { ascending: false });

  const mvp = (jugadores || []).find(j => clubsPublicados.has(j.club) && (j.minutos || 0) > 0);

  if (!mvp) {
    container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--text-muted)">Sin datos para esta jornada</div>';
    return;
  }

  window._mvpData = { mvp, jornada };

  const statsGrid = (bg) => `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
      <div style="background:${bg};border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:22px;font-weight:900;color:white">${mvp.puntos}</div>
        <div style="font-size:8px;color:rgba(255,255,255,0.5);letter-spacing:1px">PTS</div>
      </div>
      <div style="background:${bg};border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:22px;font-weight:900;color:white">${mvp.minutos||0}</div>
        <div style="font-size:8px;color:rgba(255,255,255,0.5);letter-spacing:1px">MIN</div>
      </div>
      <div style="background:${bg};border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:22px;font-weight:900;color:white">${(mvp.gol||0) + (mvp.penalti_marcado||0)}</div>
        <div style="font-size:8px;color:rgba(255,255,255,0.5);letter-spacing:1px">GOLES</div>
      </div>
      <div style="background:${bg};border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:22px;font-weight:900;color:white">${mvp.asistencia||0}</div>
        <div style="font-size:8px;color:rgba(255,255,255,0.5);letter-spacing:1px">ASIST.</div>
      </div>
    </div>`;

  container.innerHTML =
    '<div style="background:var(--green-brand);border-radius:var(--radius);padding:20px;margin-bottom:16px;background-image:repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(0,0,0,0.06) 40px,rgba(0,0,0,0.06) 80px),repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(0,0,0,0.06) 40px,rgba(0,0,0,0.06) 80px)">' +
      '<div style="font-size:9px;color:rgba(255,255,255,0.6);letter-spacing:3px;text-transform:uppercase;margin-bottom:12px">MVP JORNADA ' + jornada + '</div>' +
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">' +
        '<div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:white;flex-shrink:0;overflow:hidden">' +
          (mvp.foto_url ? '<img src="' + mvp.foto_url + '" width="64" height="64" style="object-fit:cover;border-radius:50%">' : mvp.nombre.substring(0,2).toUpperCase()) +
        '</div>' +
        '<div>' +
          '<div style="font-family:var(--font-display);font-size:22px;font-weight:800;color:white;line-height:1.1">' + mvp.nombre + '</div>' +
          '<div style="font-family:var(--font-mono);font-size:11px;color:rgba(255,255,255,0.6);margin-top:4px">' + mvp.posicion + ' · ' + mvp.club + '</div>' +
        '</div>' +
      '</div>' +
      statsGrid('rgba(0,0,0,0.2)') +
    '</div>' +
    '<button onclick="exportarMVP()" style="width:100%;padding:10px;background:var(--green-brand);color:white;border:none;border-radius:10px;font-family:var(--font-display);font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">' +
      '<i class="ti ti-share"></i> Compartir MVP' +
    '</button>';
}

async function exportarMVP() {
  const data = window._mvpData;
  if (!data) { showToast('Sin datos para compartir'); return; }

  const { mvp, jornada } = data;

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

  const fotoImg   = await cargarImg(mvp.foto_url);
  const escudoImg = await cargarImg(mvp.escudo_url);

  // ── Header ──
  ctx.font = 'bold 36px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('ASTUR', 40, 54);
  ctx.fillStyle = '#007a45';
  ctx.fillText('FANTASY', 40 + ctx.measureText('ASTUR').width, 54);

  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#007a45';
  ctx.fillText(`MVP · J${jornada}`, SIZE - 40, 54);

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

  // ── Foto grande centrada ──
  const r = 280;
  const cx = SIZE / 2;
  const cy = 90 + 60 + r;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#007a45';
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
    ctx.font = 'bold 110px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mvp.nombre.substring(0,2).toUpperCase(), cx, cy);
  }

  // Escudo centrado en la parte inferior de la foto
  if (escudoImg) {
    const er = 44;
    const ex = cx;
    const ey = cy + r - er + 8;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.clip();
    ctx.drawImage(escudoImg, ex - er, ey - er, er * 2, er * 2);
    ctx.restore();
  }

  // ── Puntos debajo de la foto ──
  const ptsY = cy + r + 50;
  ctx.fillStyle = '#007a45';
  ctx.font = 'bold 60px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(mvp.puntos + ' puntos', SIZE / 2, ptsY);

  // ── Nombre grande en mayúsculas ──
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 96px sans-serif';
  ctx.fillText(mvp.nombre.toUpperCase(), SIZE / 2, ptsY + 80);

  // ── Posición y club ──
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '22px monospace';
  ctx.fillText(`${mvp.posicion} · ${mvp.club} · ${mvp.valor}M`, SIZE / 2, ptsY + 196);

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
    const file = new File([blob], `mvp_J${jornada}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `MVP J${jornada} · AsturFantasy` });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mvp_J${jornada}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
}

async function compartirClasificacion(nombreEquipo, posicion, puntos, tipo, club, ligaId, ligaNombre) {
  let tabla = [];
  let titulo = '';
  let subtitulo = '';

  if (tipo === 'jornada') {
    const jornadaRanking = jornadadCerrada() ? JORNADA_ACTIVA : JORNADA_VISIBLE;
    const { data } = await db.from('clasificacion_automatica').select('nombre_equipo, puntos, user_id').eq('jornada', jornadaRanking).order('puntos', { ascending: false });
    tabla = (data || []).map((r, i) => ({ pos: i+1, nombre: r.nombre_equipo, pts: r.puntos, esYo: r.user_id === currentUser?.id }));
    titulo = 'Jornada ' + jornadaRanking;
    subtitulo = 'Clasificación semanal';
  } else if (tipo === 'pena') {
    const { data: penaAll } = await db.from('clasificacion_general_auto').select('*');
    const { data: equiposFav } = await db.from('equipos').select('user_id').eq('equipo_favorito', club);
    const userIdsFav = new Set((equiposFav || []).map(e => e.user_id));
    const filtrada = (penaAll || []).filter(r => userIdsFav.has(r.user_id));
    tabla = filtrada.map((r, i) => ({ pos: i+1, nombre: r.nombre_equipo, pts: r.puntos_total, esYo: r.user_id === currentUser?.id }));
    const nombreClub = CLUBES_INFO[club]?.nombre || club || 'tu club';
    titulo = nombreClub;
    subtitulo = 'Liga de peña';
  } else if (tipo === 'liga') {
    const { data: miembros } = await db.from('liga_miembros').select('user_id').eq('liga_id', ligaId);
    const userIds = (miembros || []).map(m => m.user_id);
    const { data } = await db.from('clasificacion_general_auto').select('*').in('user_id', userIds);
    tabla = (data || []).sort((a,b) => b.puntos_total - a.puntos_total).map((r,i) => ({ pos: i+1, nombre: r.nombre_equipo, pts: r.puntos_total, esYo: r.user_id === currentUser?.id }));
    titulo = ligaNombre;
    subtitulo = 'Liga privada';
  } else {
    const { data } = await db.from('clasificacion_general_auto').select('*');
    tabla = (data || []).map((r, i) => ({ pos: i+1, nombre: r.nombre_equipo, pts: r.puntos_total, esYo: r.user_id === currentUser?.id }));
    titulo = 'Clasificación general';
    subtitulo = 'AsturFantasy';
  }

  const top10 = Array.from({ length: 10 }, (_, i) => tabla[i] || { pos: i+1, nombre: '—', pts: '—', esYo: false, vacio: true });
  const yo = tabla.find(r => r.esYo);
  const yoEnTop10 = yo && yo.pos <= 10;

  const SIZE = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#101715';
  ctx.fillRect(0, 0, SIZE, SIZE);

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
  ctx.fillText(titulo, SIZE - 40, 55);

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

  // ── Filas ──
  const HEADER_H = 90;
  const FOOTER_H = 50;
  const listaTotal = yoEnTop10 ? top10 : [...top10, null, yo].filter(Boolean);
  const AVAILABLE_H = SIZE - HEADER_H - FOOTER_H;
  const ROW_H = Math.floor(AVAILABLE_H / listaTotal.length);
  const CARD_H = ROW_H - 8;
  const PADDING = 16;

  const medalColor = (pos) => {
    if (pos === 1) return '#e3b341';
    if (pos === 2) return '#8b949e';
    if (pos === 3) return '#cd7f32';
    return 'rgba(255,255,255,0.3)';
  };

  const dibujarFila = (r, y, esYo, esSeparador = false) => {
    if (esSeparador) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADDING, y + CARD_H / 2);
      ctx.lineTo(SIZE - PADDING, y + CARD_H / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    ctx.fillStyle = r.vacio ? 'rgba(255,255,255,0.03)' : esYo ? 'rgba(0,122,69,0.2)' : r.pos % 2 === 0 ? '#141a17' : '#0f1512';
    if (r.vacio) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(PADDING, y, SIZE - PADDING * 2, CARD_H, 8);
      ctx.stroke();
      return;
    }

    ctx.fillStyle = esYo ? 'rgba(0,122,69,0.2)' : r.pos % 2 === 0 ? '#141a17' : '#0f1512';
    ctx.beginPath();
    ctx.roundRect(PADDING, y, SIZE - PADDING * 2, CARD_H, 8);
    ctx.fill();

    if (esYo) {
      ctx.strokeStyle = '#007a45';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(PADDING, y, SIZE - PADDING * 2, CARD_H, 8);
      ctx.stroke();
    }

    // Posición
    ctx.fillStyle = medalColor(r.pos);
    ctx.font = `bold ${Math.floor(CARD_H * 0.35)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(r.pos, PADDING + 14, y + CARD_H / 2);

    // Nombre
    ctx.fillStyle = esYo ? '#00d97e' : '#ffffff';
    ctx.font = `bold ${Math.floor(CARD_H * 0.32)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(r.nombre, PADDING + 70, y + CARD_H / 2);

    // Puntos
    ctx.fillStyle = esYo ? '#00d97e' : '#ffffff';
    ctx.font = `bold ${Math.floor(CARD_H * 0.35)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(r.pts + ' pts', SIZE - PADDING - 14, y + CARD_H / 2);
  };

  let currentY = HEADER_H;
  top10.forEach(r => {
    dibujarFila(r, currentY, r.esYo);
    currentY += ROW_H;
  });

  if (!yoEnTop10 && yo) {
    dibujarFila(null, currentY, false, true);
    currentY += ROW_H;
    dibujarFila(yo, currentY, true);
  }

  // ── Footer ──
  const footerY = SIZE - FOOTER_H;
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
  ctx.fillText('asturfantasy.com', SIZE / 2, footerY + 25);

  canvas.toBlob(async blob => {
    const file = new File([blob], `clasificacion_${tipo || 'general'}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `${titulo} · AsturFantasy` });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'clasificacion.png';
      a.click();
      URL.revokeObjectURL(url);
    }
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
        <td><div class="rank-name" style="cursor:pointer;text-decoration:underline" onclick="mostrarHistorial('${j.nombre}','${j.club}','${j.posicion}')">${j.nombre}</div><div class="rank-team">${j.posicion} · ${j.valor || 0}M</div></td>
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

let rankingDetalleData = null;

async function loadRankingDetalle() {
  if (!rankingDetalleData) {
    const { data } = await db.from('ranking_jugadores').select('nombre, club, posicion, escudo_url, foto_url, goles, asistencias, porterias_cero, amarillas, rojas, minutos_total');
    rankingDetalleData = data || [];
  }
  cambiarSubtabDetalle('goles');
}

function cambiarSubtabDetalle(subtab) {
  document.querySelectorAll('.ranking-subtab').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-subtab="' + subtab + '"]')?.classList.add('active');

  const campos = {
    goles:       { campo: 'goles',          label: 'Goles',         icono: '⚽' },
    asistencias: { campo: 'asistencias',    label: 'Asistencias',   icono: '👟' },
    porterias:   { campo: 'porterias_cero', label: 'Port. a cero',  icono: '🔒' },
    amarillas:   { campo: 'amarillas',      label: 'Amarillas',     icono: '🟨' },
    rojas:       { campo: 'rojas',          label: 'Rojas',         icono: '🟥' },
    minutos:     { campo: 'minutos_total',  label: 'Minutos',       icono: '⏱️' },
  };

  const { campo, label, icono } = campos[subtab];
  const container = document.getElementById('detalle-container');

  const filtrados = (rankingDetalleData || [])
    .filter(j => (j[campo] || 0) > 0)
    .sort((a, b) => (b[campo] || 0) - (a[campo] || 0))
    .slice(0, 20);

  if (!filtrados.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:28px;font-family:var(--font-mono);font-size:12px">Sin datos</div>';
    return;
  }

  container.innerHTML =
    '<table class="ranking-table">' +
      '<thead><tr><th>#</th><th>Jugador</th><th>Club</th><th style="text-align:right">' + icono + ' ' + label + '</th></tr></thead>' +
      '<tbody>' +
        filtrados.map((j, i) =>
          '<tr class="' + medalClass(i+1) + '">' +
            '<td><span class="rank-pos ' + medalClass(i+1) + '">' + (i+1) + '</span></td>' +
            '<td><div class="rank-name" style="cursor:pointer;text-decoration:underline" onclick="mostrarHistorial(\'' + j.nombre + '\',\'' + j.club + '\',\'' + j.posicion + '\')">' + j.nombre + '</div><div class="rank-team">' + j.posicion + '</div></td>' +
            '<td>' + (j.escudo_url ? '<img loading="lazy" src="' + j.escudo_url + '" width="22" height="22" style="object-fit:contain;vertical-align:middle;margin-right:4px">' : '') + '<span class="rank-team">' + j.club + '</span></td>' +
            '<td><div class="rank-pts">' + (j[campo] || 0) + '</div></td>' +
          '</tr>'
        ).join('') +
      '</tbody>' +
    '</table>';
}

function logrosVacios() {
  return [
    { icono: '🏆', titulo: 'Primera victoria', desc: 'Gana una jornada', desbloqueado: false },
    { icono: '🔥', titulo: 'Un clásico', desc: 'Logra el TOP50 en al menos 3 jornadas', desbloqueado: false, contador: '0/3' },
    { icono: '🔝', titulo: 'Líder', desc: 'Tu capitán fue el jugador con más puntos de tu equipo', desbloqueado: false },
    { icono: '🧱', titulo: 'El muro', desc: 'Tu portero no encaja gol', desbloqueado: false },
    { icono: '🔍', titulo: 'Scout', desc: 'Alinea un jugador de menos de 6 millones que logre 10 o más puntos en una única jornada', desbloqueado: false },
    { icono: '🧼', titulo: 'Fair Play', desc: 'Tu equipo no recibe tarjetas en una jornada', desbloqueado: false },
    { icono: '🚀', titulo: 'Artillería pesada', desc: 'Tu equipo anota 5 o más goles en una única jornada', desbloqueado: false },
    { icono: '🛡️', titulo: 'Alma de delantero', desc: 'Un defensa alineado marca un gol', desbloqueado: false },
    { icono: '🫶', titulo: 'Compañerismo', desc: 'Tu equipo logra 3 o más asistencias en una única jornada', desbloqueado: false },
    { icono: '🔮', titulo: 'Oráculo', desc: '5 jornadas consecutivas acertando entrenador', desbloqueado: false, contador: '0/5' },
    { icono: '🆘', titulo: 'Gafe', desc: 'Alineas un jugador con puntuación negativa', desbloqueado: false },
    { icono: '🌪️', titulo: 'Agitador', desc: 'Usa 50 jugadores diferentes', desbloqueado: false, contador: '0/50' },
    { icono: '💯', titulo: 'Centenario', desc: 'Logra 100 o más puntos en una única jornada', desbloqueado: false },
    { icono: '⭐', titulo: 'Milenario', desc: 'Supera los 1.000 puntos en la general', desbloqueado: false, contador: '0/1000' },
  ];
}

async function calcularLogros(misJornadasOriginal, todas, currentUser) {
  const { data: miEquipoAll } = await db
    .from('mi_equipo')
    .select('jugador_id, jornada, capitan')
    .eq('user_id', currentUser.id);

  const jugadoresIds = [...new Set((miEquipoAll || []).map(e => e.jugador_id))];

  if (!jugadoresIds.length) return logrosVacios();

  const { data: jugadoresAll } = await db
    .from('jugadores')
    .select('id, nombre, posicion, valor, gol, asistencia, amarilla, doble_amarilla, roja, goles_encajados, total_jornada, puerta_cero, puntos_entrenador, jornada, minutos')
    .in('id', jugadoresIds);

  const { data: todosPartidos } = await db
    .from('partidos')
    .select('jornada, finalizado');

  // Una jornada está finalizada solo si TODOS sus partidos están finalizados
  const jornadasPorPartidos = {};
  (todosPartidos || []).forEach(p => {
    if (!jornadasPorPartidos[p.jornada]) jornadasPorPartidos[p.jornada] = { total: 0, finalizados: 0 };
    jornadasPorPartidos[p.jornada].total++;
    if (p.finalizado) jornadasPorPartidos[p.jornada].finalizados++;
  });

  const jornadasFinalizadas = new Set(
    Object.entries(jornadasPorPartidos)
      .filter(([_, v]) => v.total > 0 && v.total === v.finalizados)
      .map(([jornada]) => parseInt(jornada))
  );

  if (!jornadasFinalizadas.size) {
    const victoriaJornada = misJornadasOriginal.some(j => {
      const ranking = todas.filter(t => t.jornada === j.jornada).sort((a,b) => b.puntos - a.puntos);
      return ranking[0]?.user_id === currentUser.id;
    });
    const totalPuntos = misJornadasOriginal.reduce((acc, j) => acc + j.puntos, 0);
    const logros = logrosVacios();
    logros[0].desbloqueado = victoriaJornada;
    logros[12].desbloqueado = totalPuntos >= 1000;
    logros[12].desc = `${totalPuntos}/1000 puntos en la general`;
    logros[12].contador = `${totalPuntos}/1000`;
    return logros;
  }

  const misJornadas = misJornadasOriginal.filter(j => jornadasFinalizadas.has(j.jornada));

  const jugadoresPorJornada = {};
  (miEquipoAll || []).forEach(e => {
    if (!jornadasFinalizadas.has(e.jornada)) return;
    if (!jugadoresPorJornada[e.jornada]) jugadoresPorJornada[e.jornada] = [];
    const jug = (jugadoresAll || []).find(j => j.id === e.jugador_id && j.jornada === e.jornada);
    if (jug) jugadoresPorJornada[e.jornada].push({ ...jug, capitan: e.capitan });
  });

  // Primera victoria
  const victoriaJornada = misJornadas.some(j => {
    const ranking = todas
      .filter(t => t.jornada === j.jornada && jornadasFinalizadas.has(t.jornada))
      .sort((a,b) => b.puntos - a.puntos);
    return ranking[0]?.user_id === currentUser.id;
  });

  // Mítico
  let miticoContador = 0;
  misJornadas.forEach(j => {
    const ranking = todas
      .filter(t => t.jornada === j.jornada && jornadasFinalizadas.has(t.jornada))
      .sort((a,b) => b.puntos - a.puntos);
    const pos = ranking.findIndex(r => r.user_id === currentUser.id);
    if (pos >= 0 && pos < 50) miticoContador++;
  });
  const miticoDesbloqueado = miticoContador >= 3;

  // Capitán acertado
  let capitanAcertado = false;
  for (const jornada of Object.keys(jugadoresPorJornada)) {
    const equipo = jugadoresPorJornada[jornada];
    const cap = equipo.find(j => j.capitan);
    if (!cap) continue;
    const maxPts = Math.max(...equipo.map(j => j.total_jornada || 0));
    if ((cap.total_jornada || 0) >= maxPts) { capitanAcertado = true; break; }
  }

  // El muro
  let elMuro = false;
  for (const jornada of Object.keys(jugadoresPorJornada)) {
    const equipo = jugadoresPorJornada[jornada];
    const por = equipo.find(j => j.posicion === 'POR');
    if (por?.puerta_cero === 1 && (por?.minutos || 0) > 0) { elMuro = true; break; }
  }

  // Scout
  let scout = false;
  for (const jornada of Object.keys(jugadoresPorJornada)) {
    const equipo = jugadoresPorJornada[jornada];
    if (equipo.some(j => j.valor < 6 && (j.total_jornada || 0) >= 10)) { scout = true; break; }
  }

  // Fair Play
  let fairPlay = false;
  for (const jornada of Object.keys(jugadoresPorJornada)) {
    const equipo = jugadoresPorJornada[jornada];
    if (equipo.length === 0) continue;
    const tieneMinutos = equipo.some(j => (j.minutos || 0) > 0);
    if (!tieneMinutos) continue;
    const sinTarjetas = equipo.every(j =>
      (j.amarilla || 0) === 0 &&
      (j.doble_amarilla || 0) === 0 &&
      (j.roja || 0) === 0
    );
    if (sinTarjetas) { fairPlay = true; break; }
  }

  // Artillería pesada
  let artilleria = false;
  for (const jornada of Object.keys(jugadoresPorJornada)) {
    const equipo = jugadoresPorJornada[jornada];
    const totalGoles = equipo.reduce((acc, j) => acc + (j.gol || 0), 0);
    if (totalGoles >= 5) { artilleria = true; break; }
  }

  // Alma de delantero
  let almaDelantero = false;
  for (const jornada of Object.keys(jugadoresPorJornada)) {
    const equipo = jugadoresPorJornada[jornada];
    if (equipo.some(j => j.posicion === 'DEF' && (j.gol || 0) > 0)) { almaDelantero = true; break; }
  }

  // Compañerismo
  let companerismo = false;
  for (const jornada of Object.keys(jugadoresPorJornada)) {
    const equipo = jugadoresPorJornada[jornada];
    const totalAsist = equipo.reduce((acc, j) => acc + (j.asistencia || 0), 0);
    if (totalAsist >= 3) { companerismo = true; break; }
  }

  // D. Trébol
  let trebolMax = 0;
  let trebolActual = 0;
  const jornadasOrdenadas = Object.keys(jugadoresPorJornada).sort((a,b) => a-b);
  jornadasOrdenadas.forEach(jornada => {
    const equipo = jugadoresPorJornada[jornada];
    const ent = equipo.find(j => j.posicion === 'ENT');
    if (ent && (ent.puntos_entrenador || 0) > 0) {
      trebolActual++;
      trebolMax = Math.max(trebolMax, trebolActual);
    } else {
      trebolActual = 0;
    }
  });
  const trebolDesbloqueado = trebolMax >= 5;

  // Agitador: 50 jugadores diferentes durante la temporada
  const jugadoresDiferentes = new Set(
    (miEquipoAll || []).map(e => e.jugador_id)
  ).size;
  const agitadorDesbloqueado = jugadoresDiferentes >= 50;

  // Gafe
  let gafe = false;
  for (const jornada of Object.keys(jugadoresPorJornada)) {
    const equipo = jugadoresPorJornada[jornada];
    if (equipo.some(j => (j.total_jornada || 0) < 0)) { gafe = true; break; }
  }

  // Centenario
  let centenario = false;
  misJornadas.forEach(j => { if (j.puntos >= 100) centenario = true; });

  // Milenario
  const totalPuntos = misJornadas.reduce((acc, j) => acc + j.puntos, 0);
  const milenarioDesbloqueado = totalPuntos >= 1000;

  return [
    { icono: '🏆', titulo: 'Primera victoria', desc: 'Gana una jornada', desbloqueado: victoriaJornada },
    { icono: '🔥', titulo: 'Un clásico', desc: 'Logra el TOP50 en al menos 3 jornadas', desbloqueado: miticoDesbloqueado, contador: `${Math.min(miticoContador, 3)}/3` },
    { icono: '🔝', titulo: 'Líder', desc: 'Tu capitán fue el jugador con más puntos de tu equipo', desbloqueado: capitanAcertado },
    { icono: '🧱', titulo: 'El muro', desc: 'Tu portero no encaja gol', desbloqueado: elMuro },
    { icono: '🔍', titulo: 'Scout', desc: 'Alinea un jugador de menos de 6 millones que logre 10 o más puntos en una única jornada', desbloqueado: scout },
    { icono: '🧼', titulo: 'Fair Play', desc: 'Tu equipo no recibe tarjetas en una jornada', desbloqueado: fairPlay },
    { icono: '🚀', titulo: 'Artillería pesada', desc: 'Tu equipo anota 5 o más goles en una única jornada', desbloqueado: artilleria },
    { icono: '🛡️', titulo: 'Alma de delantero', desc: 'Un defensa alineado marca un gol', desbloqueado: almaDelantero },
    { icono: '🫶', titulo: 'Compañerismo', desc: 'Tu equipo logra 3 o más asistencias en una única jornada', desbloqueado: companerismo },
    { icono: '🔮', titulo: 'Oráculo', desc: `${Math.min(trebolMax, 5)}/5 jornadas consecutivas acertando entrenador`, desbloqueado: trebolDesbloqueado, contador: `${Math.min(trebolMax, 5)}/5` },
    { icono: '🆘', titulo: 'Gafe', desc: 'Alineas un jugador con puntuación negativa', desbloqueado: gafe },
    { icono: '🌪️', titulo: 'Agitador', desc: 'Usa 50 jugadores diferentes', desbloqueado: agitadorDesbloqueado, contador: `${Math.min(jugadoresDiferentes, 50)}/50` },
    { icono: '💯', titulo: 'Centenario', desc: 'Logra 100 o más puntos en una única jornada', desbloqueado: centenario },
    { icono: '⭐', titulo: 'Milenario', desc: 'Supera los 1.000 puntos en la general', desbloqueado: milenarioDesbloqueado, contador: `${totalPuntos}/1000` },
  ];
}

async function loadPerfil() {
  if (!currentUser) return;

  // Datos del equipo
  const { data: equipo } = await db.from('equipos').select('nombre_equipo, equipo_favorito').eq('user_id', currentUser.id).single();
  const nombreEquipo = equipo?.nombre_equipo || '—';
  const clubFav = equipo?.equipo_favorito || null;
  const clubInfo = clubFav ? CLUBES_INFO[clubFav] : null;

  // Avatar
  const avatar = document.getElementById('perfil-avatar');
  avatar.textContent = nombreEquipo.substring(0, 2).toUpperCase();
  document.getElementById('perfil-nombre-equipo').textContent = nombreEquipo;
  document.getElementById('perfil-club-fav').textContent = clubInfo ? clubInfo.nombre : '—';

  // Clasificación semanal del usuario
  const { data: clasificacion } = await db.from('clasificacion_automatica')
    .select('jornada, puntos')
    .eq('user_id', currentUser.id)
    .order('jornada', { ascending: true });

  // Clasificación general de todas las jornadas para el ranking semanal
  const { data: todasClasificaciones } = await db.from('clasificacion_automatica')
    .select('user_id, jornada, puntos')
    .order('jornada', { ascending: true });

  const misJornadas = clasificacion || [];
  const todas = todasClasificaciones || [];

  // Calcular estadísticas
  const puntosPorJornada = misJornadas.map(j => j.puntos);
  const mejorJornada = puntosPorJornada.length ? Math.max(...puntosPorJornada) : 0;
  const peorJornada = puntosPorJornada.length ? Math.min(...puntosPorJornada) : 0;
  const media = puntosPorJornada.length ? (puntosPorJornada.reduce((a,b) => a+b, 0) / puntosPorJornada.length).toFixed(1) : 0;
  const mejorJornadaNum = misJornadas.find(j => j.puntos === mejorJornada)?.jornada || '—';

  // Jornadas consecutivas en top 10
  const jornadasUnicas = [...new Set(todas.map(j => j.jornada))].sort((a,b) => a-b);
  let rachaActual = 0, rachaMax = 0, rachaTemp = 0;
  jornadasUnicas.forEach(jornada => {
    const ranking = todas.filter(j => j.jornada === jornada).sort((a,b) => b.puntos - a.puntos);
    const pos = ranking.findIndex(j => j.user_id === currentUser.id) + 1;
    if (pos > 0 && pos <= 10) {
      rachaTemp++;
      rachaMax = Math.max(rachaMax, rachaTemp);
    } else {
      rachaTemp = 0;
    }
  });
  // Racha actual (desde el final)
  for (let i = jornadasUnicas.length - 1; i >= 0; i--) {
    const jornada = jornadasUnicas[i];
    const ranking = todas.filter(j => j.jornada === jornada).sort((a,b) => b.puntos - a.puntos);
    const pos = ranking.findIndex(j => j.user_id === currentUser.id) + 1;
    if (pos > 0 && pos <= 10) rachaActual++;
    else break;
  }

  // Jugador más usado
  const { data: misEquipos } = await db.from('mi_equipo').select('jugador_id, jornada').eq('user_id', currentUser.id);
  const { data: jugadoresInfo } = await db.from('jugadores').select('id, nombre, club, jornada, puntos, total_jornada').order('jornada', { ascending: false });
  const contadorJugadores = {};
  (misEquipos || []).forEach(e => {
    contadorJugadores[e.jugador_id] = (contadorJugadores[e.jugador_id] || 0) + 1;
  });
  const masUsadoId = Object.entries(contadorJugadores).sort((a,b) => b[1] - a[1])[0];
  let masUsadoNombre = '—', masUsadoVeces = 0;
  if (masUsadoId) {
    masUsadoVeces = masUsadoId[1];
    const jugMasUsado = (jugadoresInfo || []).find(j => j.id === masUsadoId[0]);
    masUsadoNombre = jugMasUsado?.nombre || '—';
  }

  // Jugador agradecido (mejor media pts / veces alineado)
  const jugadorPuntos = {};
  for (const e of (misEquipos || [])) {
    const jug = (jugadoresInfo || []).find(j => j.id === e.jugador_id);
    if (!jug) continue;
    const clave = jug.nombre + '|' + jug.club;
    const jugJornada = (jugadoresInfo || []).find(j => j.nombre === jug.nombre && j.club === jug.club && j.jornada === e.jornada);
    if (!jugJornada) continue;
    if (!jugadorPuntos[clave]) jugadorPuntos[clave] = { pts: 0, veces: 0, nombre: jug.nombre };
    jugadorPuntos[clave].pts += jugJornada.total_jornada || 0;
    jugadorPuntos[clave].veces++;
  }
  const agradecido = Object.values(jugadorPuntos)
    .filter(j => j.veces >= 1)
    .sort((a,b) => (b.pts/b.veces) - (a.pts/a.veces))[0];

    console.log('misEquipos:', misEquipos?.length);
    console.log('jugadoresInfo:', jugadoresInfo?.length);
    console.log('jugadorPuntos:', jugadorPuntos);
    console.log('agradecido:', agradecido);
    console.log('todos jugadorPuntos:', Object.values(jugadorPuntos).map(j => ({nombre: j.nombre, pts: j.pts, veces: j.veces, media: j.pts/j.veces})));

  // Pintar estadísticas
  const stats = [
    { label: 'Mejor jornada', value: mejorJornada + ' pts', sub: 'J' + mejorJornadaNum, color: 'var(--neon)' },
    { label: 'Peor jornada', value: peorJornada + ' pts', sub: misJornadas.find(j => j.puntos === peorJornada)?.jornada ? 'J' + misJornadas.find(j => j.puntos === peorJornada)?.jornada : '—', color: 'var(--red)' },
    { label: 'Media por jornada', value: media + ' pts', sub: puntosPorJornada.length + ' jornadas', color: 'var(--amber)' },
    { label: 'Racha top 10', value: rachaActual + ' jornadas', sub: 'Máx. ' + rachaMax, color: 'var(--amber)' },
    { label: 'Jugador más usado', value: masUsadoNombre, sub: masUsadoVeces + ' jornadas', color: 'white' },
    { label: 'Jugador agradecido', value: agradecido?.nombre || '—', sub: agradecido ? (agradecido.pts/agradecido.veces).toFixed(1) + ' pts/jornada' : '—', color: 'white' },
  ];

  document.getElementById('perfil-stats').innerHTML = stats.map(s =>
    '<div style="background:var(--surface);border-radius:10px;padding:12px">' +
      '<div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">' + s.label + '</div>' +
      '<div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:' + s.color + '">' + s.value + '</div>' +
      '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:2px">' + s.sub + '</div>' +
    '</div>'
  ).join('');

  const logros = await calcularLogros(misJornadas, todas, currentUser);

  document.getElementById('perfil-logros').innerHTML = logros.map(l =>
    '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--surface);border-radius:10px;' + (!l.desbloqueado ? 'opacity:0.4;' : 'border:1px solid rgba(76,217,123,0.2);') + '">' +
      '<div style="font-size:24px;flex-shrink:0">' + l.icono + '</div>' +
      '<div style="flex:1">' +
        '<div style="font-family:var(--font-display);font-size:13px;font-weight:600;color:' + (l.desbloqueado ? 'var(--text)' : 'var(--text-muted)') + '">' + l.titulo + '</div>' +
        '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:2px">' + l.desc + '</div>' +
      '</div>' +
      (l.desbloqueado ? '<i class="ti ti-check" style="color:var(--neon);font-size:18px"></i>' : (l.contador ? '<span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">' + l.contador + '</span>' : '<i class="ti ti-lock" style="color:var(--text-muted);font-size:16px"></i>')) +
    '</div>'
  ).join('');

  const todosDesbloqueados = logros.every(l => l.desbloqueado);
  const completados = logros.filter(l => l.desbloqueado).length;
  const total = logros.length;

  const existente = document.getElementById('insignia-leyenda');
  if (existente) existente.remove();

  document.getElementById('perfil-logros').insertAdjacentHTML('afterend', `
    <div id="insignia-leyenda" style="margin-top:20px;background:linear-gradient(135deg,rgba(0,122,69,0.2),rgba(76,217,123,0.1));
                border:1px solid var(--border-neon);border-radius:14px;padding:20px;text-align:center;
                ${!todosDesbloqueados ? 'opacity:0.5;' : ''}">
      <div style="font-size:36px;margin-bottom:8px">${todosDesbloqueados ? '👑' : '🔒'}</div>
      <div style="font-family:var(--font-display);font-weight:700;font-size:16px;color:var(--text);margin-bottom:4px">
        ${todosDesbloqueados ? '¡Leyenda AsturFantasy!' : 'Insignia Leyenda'}
      </div>
      <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);margin-bottom:16px">
        ${todosDesbloqueados ? 'Has desbloqueado todos los logros' : `${completados}/${total} logros completados`}
      </div>
      <button onclick="${todosDesbloqueados ? 'reclamarLeyenda()' : ''}"
        style="background:var(--green-brand);color:white;border:none;border-radius:10px;
               padding:10px 24px;font-family:var(--font-display);font-weight:700;
               font-size:13px;cursor:${todosDesbloqueados ? 'pointer' : 'not-allowed'};
               opacity:${todosDesbloqueados ? '1' : '0.5'}">
        Reclamar
      </button>
    </div>
  `);
}

async function reclamarLeyenda() {
  const { data: eq } = await db.from('equipos').select('nombre_equipo').eq('user_id', currentUser.id).single();
  const nombreEquipo = eq?.nombre_equipo || 'Sin nombre';
  const email = currentUser?.email || 'Sin email';
  const nombre = currentUser?.user_metadata?.full_name || 'Sin nombre';

  const mailto = `mailto:asturfantasycontacto@gmail.com?subject=Reclamación insignia Leyenda&body=Usuario: ${nombre}%0AEmail: ${email}%0AEquipo: ${nombreEquipo}`;
  window.open(mailto);
}

async function compartirPerfil() {
  const btn = document.getElementById('btn-compartir-perfil');
  btn.disabled = true; btn.textContent = 'GENERANDO...';

  const nombreEquipo = document.getElementById('perfil-nombre-equipo').textContent;
  const clubFav = document.getElementById('perfil-club-fav').textContent;
  const stats = [...document.querySelectorAll('#perfil-stats > div')].map(s => ({
    label: s.querySelector('[style*="letter-spacing"]').textContent,
    value: s.querySelector('[style*="font-size:16px"]').textContent,
    sub: s.querySelectorAll('div')[2]?.textContent || ''
  }));
  const logros = [...document.querySelectorAll('#perfil-logros > div')].map(l => ({
    icono: l.querySelector('div:first-child').textContent,
    titulo: l.querySelectorAll('div')[1]?.querySelector('div')?.textContent || '',
    desbloqueado: l.style.opacity !== '0.4'
  }));

  const tarjeta = document.createElement('div');
  tarjeta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:360px;background:#0d1117;border-radius:16px;overflow:hidden;font-family:Space Grotesk,sans-serif;border:1px solid rgba(76,217,123,0.2)';

  tarjeta.innerHTML =
    // Header
    '<div style="padding:16px;background:linear-gradient(135deg,#111816,#0d1f14);border-bottom:1px solid rgba(76,217,123,0.15)">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">' +
        '<img src="https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/logo_asturfantasy_redondo.png" width="22" height="22" style="border-radius:6px" onerror="this.style.display=\'none\'">' +
        '<span style="color:white;font-weight:700;font-size:12px">Astur<span style="color:#4cd97b">Fantasy</span></span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="width:48px;height:48px;border-radius:50%;background:rgba(76,217,123,0.15);border:2px solid rgba(76,217,123,0.4);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#4cd97b">' + nombreEquipo.substring(0,2).toUpperCase() + '</div>' +
        '<div>' +
          '<div style="font-size:16px;font-weight:700;color:white">' + nombreEquipo + '</div>' +
          '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">' + clubFav + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    // Stats
    '<div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.06)">' +
      '<div style="font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px">Estadísticas</div>' +
      '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">' +
        stats.map(s => '<div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:10px">' +
          '<div style="font-size:8px;color:rgba(255,255,255,0.4);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">' + s.label + '</div>' +
          '<div style="font-size:14px;font-weight:700;color:white">' + s.value + '</div>' +
          '<div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:2px">' + s.sub + '</div>' +
        '</div>').join('') +
      '</div>' +
    '</div>' +
    // Logros
    '<div style="padding:14px 16px">' +
      '<div style="font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px">Logros</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px">' +
        logros.map(l => '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:8px;' + (l.desbloqueado ? 'border:1px solid rgba(76,217,123,0.2);' : 'opacity:0.4;') + '">' +
          '<span style="font-size:18px">' + l.icono + '</span>' +
          '<span style="font-size:12px;font-weight:600;color:' + (l.desbloqueado ? 'white' : 'rgba(255,255,255,0.5)') + '">' + l.titulo + '</span>' +
          (l.desbloqueado ? '<span style="margin-left:auto;color:#4cd97b;font-size:14px">✓</span>' : '<span style="margin-left:auto;color:rgba(255,255,255,0.3);font-size:12px">🔒</span>') +
        '</div>').join('') +
      '</div>' +
    '</div>' +
    // Footer
    '<div style="padding:10px 16px;background:rgba(0,0,0,0.3);text-align:center">' +
      '<span style="font-size:9px;color:rgba(255,255,255,0.3)">asturfantasy.com</span>' +
    '</div>';

  document.body.appendChild(tarjeta);
  try {
    const canvas = await html2canvas(tarjeta, { backgroundColor: '#0d1117', scale: 2, useCORS: true });
    document.body.removeChild(tarjeta);
    canvas.toBlob(async blob => {
      const file = new File([blob], nombreEquipo + '_perfil.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: nombreEquipo + ' · AsturFantasy' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = nombreEquipo + '_perfil.png'; a.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch(e) {
    if (document.body.contains(tarjeta)) document.body.removeChild(tarjeta);
    showToast('Error al compartir');
  }
  btn.disabled = false; btn.textContent = 'COMPARTIR PERFIL';
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
  const { data, error } = await db.from('jugadores').select('nombre, club, posicion, puntos, valor, escudo_url, foto_url').eq('jornada', jornada).order('puntos', { ascending: false }).order('valor', { ascending: true });
  if (error || !data?.length) { container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--text-muted)">Sin datos para esta jornada</div>'; return; }
  const porPos = { POR:[], DEF:[], MED:[], DEL:[], ENT:[] };
  data.forEach(j => porPos[j.posicion]?.push(j));
  const portero = porPos.POR.sort((a,b) => b.puntos - a.puntos).slice(0,1);
  const defs = porPos.DEF.sort((a,b) => b.puntos - a.puntos);
  const meds = porPos.MED.sort((a,b) => b.puntos - a.puntos);
  const dels = porPos.DEL.sort((a,b) => b.puntos - a.puntos);
  const entrenador = porPos.ENT.sort((a,b) => b.puntos - a.puntos).slice(0,1);
  let defOnce = defs.slice(0,3), medOnce = meds.slice(0,3), delOnce = dels.slice(0,1);
  const candidatos = [...defs.slice(3,5).map(j=>({...j,_pos:'DEF'})),...meds.slice(3,4).map(j=>({...j,_pos:'MED'})),...dels.slice(1,3).map(j=>({...j,_pos:'DEL'}))].sort((a,b)=>b.puntos-a.puntos);
  let huecos = 3;
  for (const c of candidatos) {
    if (!huecos) break;
    if (c._pos==='DEF' && defOnce.length<5) { defOnce.push(c); huecos--; }
    else if (c._pos==='MED' && medOnce.length<4) { medOnce.push(c); huecos--; }
    else if (c._pos==='DEL' && delOnce.length<3) { delOnce.push(c); huecos--; }
  }
  const totalPuntos = [...portero,...defOnce,...medOnce,...delOnce,...entrenador].reduce((acc,j)=>acc+j.puntos,0);
  if (!totalPuntos) { container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);font-family:var(--font-display);font-size:16px">Aún no tenemos el once de la jornada</div>'; return; }
  const filas = [{ label:'🧤 PORTERO', pos:'POR', jugadores:portero },{ label:'🛑 DEFENSAS', pos:'DEF', jugadores:defOnce },{ label:'🧠 MEDIOS', pos:'MED', jugadores:medOnce },{ label:'⚽ DELANTEROS', pos:'DEL', jugadores:delOnce },{ label:'👔 ENTRENADOR', pos:'ENT', jugadores:entrenador }];

  window._onceIdealData = { jornada, portero, defOnce, medOnce, delOnce, entrenador, totalPuntos };

  const posColor = { POR:'#e3b341', DEF:'#5b9cf6', MED:'#4cd97b', DEL:'#f05e5e', ENT:'#a78bfa' };

  container.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--neon);letter-spacing:2px">Formación: ' + defOnce.length + '-' + medOnce.length + '-' + delOnce.length + '</div>' +
      '<div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">TOTAL: <strong style="color:var(--neon)">' + totalPuntos + ' pts</strong></div>' +
    '</div>' +
    filas.map(fila => fila.jugadores.length === 0 ? '' :
      '<div style="margin-bottom:14px">' +
        '<div style="font-family:var(--font-display);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);padding-bottom:5px;margin-bottom:8px">' + fila.label + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:4px">' +
          fila.jugadores.map(j =>
            '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--surface);border-radius:8px">' +
              '<div style="width:10px;height:10px;border-radius:50%;background:' + posColor[fila.pos] + ';flex-shrink:0"></div>' +
              (j.escudo_url ? '<img loading="lazy" src="' + j.escudo_url + '" width="20" height="20" style="object-fit:contain;flex-shrink:0">' : '') +
              '<div style="flex:1;font-family:var(--font-display);font-weight:600;font-size:13px;color:var(--text)">' + j.nombre + '</div>' +
              '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">' + j.club + '</div>' +
              '<div style="font-family:var(--font-display);font-weight:700;font-size:18px;color:var(--neon);min-width:28px;text-align:right">' + j.puntos + '</div>' +
            '</div>'
          ).join('') +
        '</div>' +
      '</div>'
    ).join('') +
    '<button onclick="compartirOnceIdeal()" style="width:100%;margin-top:16px;padding:10px;background:var(--green-brand);color:white;border:none;border-radius:10px;font-family:var(--font-display);font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px"><i class="ti ti-share"></i> Compartir once ideal</button>';
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

/* ============================================================
   compartirOnce.js — Compartir Once Ideal y Once Rentable
   ============================================================ */

async function compartirOnceIdeal() {
  await new FontFace('Space Grotesk', 'url(https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-700-normal.woff2)').load()
    .then(f => document.fonts.add(f))
    .catch(() => {});

  const { jornada, portero, defOnce, medOnce, delOnce, entrenador, totalPuntos } = window._onceIdealData;
  const formacion = defOnce.length + '-' + medOnce.length + '-' + delOnce.length;

  const todos = [
    { pos: 'POR', jugadores: portero },
    { pos: 'DEF', jugadores: defOnce },
    { pos: 'MED', jugadores: medOnce },
    { pos: 'DEL', jugadores: delOnce },
    { pos: 'ENT', jugadores: entrenador }
  ].flatMap(f => f.jugadores);

  const mitad = Math.ceil(todos.length / 2);
  const colIzq = todos.slice(0, mitad);
  const colDer = todos.slice(mitad);

  const SIZE = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  // Fondo sólido
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
  const HEADER_H = 140;

  // Logo ASTURFANTASY
  ctx.font = 'bold 36px "Space Grotesk"';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('ASTUR', 40, 48);
  ctx.fillStyle = '#007a45';
  ctx.fillText('FANTASY', 40 + ctx.measureText('ASTUR').width, 48);

  // Puntos totales en grande a la derecha
  ctx.font = 'bold 64px "Space Grotesk"';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#007a45';
  ctx.fillText(totalPuntos, SIZE - 40, 55);
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('puntos totales', SIZE - 40, 90);

  // Once ideal y jornada
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Space Grotesk"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Once ideal · J${jornada}`, 40, 88);

  // Formación
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '13px monospace';
  ctx.fillText(formacion, 40, 118);

  // Línea separadora header
  const gradH = ctx.createLinearGradient(0, 0, SIZE, 0);
  gradH.addColorStop(0, 'transparent');
  gradH.addColorStop(0.5, 'rgba(0,122,69,0.5)');
  gradH.addColorStop(1, 'transparent');
  ctx.strokeStyle = gradH;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HEADER_H);
  ctx.lineTo(SIZE, HEADER_H);
  ctx.stroke();

  // ── Jugadores ──
  const PADDING = 32;
  const COL_W = SIZE / 2;
  const filas = Math.max(colIzq.length, colDer.length);
  const AVAILABLE_H = SIZE - HEADER_H - 70;
  const ROW_H = Math.floor(AVAILABLE_H / filas);
  const CARD_H = ROW_H - 16;
  const START_Y = HEADER_H + 10;

  const dibujarJugador = async (j, x, y, cardW) => {
    const fotoImg   = await cargarImg(j.foto_url);
    const escudoImg = await cargarImg(j.escudo_url);

    ctx.fillStyle = '#007a45';
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, CARD_H, 10);
    ctx.fill();

    const r = Math.floor(CARD_H * 0.38);
    const cx = x + 14 + r;
    const cy = y + CARD_H / 2;

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
      ctx.font = `bold ${Math.floor(r * 0.6)}px "Space Grotesk"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(j.nombre.substring(0,2).toUpperCase(), cx, cy);
    }

    if (escudoImg) {
      const er = Math.floor(r * 0.35);
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

    const txtX = x + 14 + r * 2 + 12;

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(CARD_H * 0.22)}px "Space Grotesk"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(j.nombre, txtX, y + CARD_H * 0.18);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${Math.floor(CARD_H * 0.16)}px monospace`;
    ctx.fillText(j.posicion + ' · ' + j.club, txtX, y + CARD_H * 0.48);

    ctx.fillStyle = '#00d97e';
    ctx.font = `bold ${Math.floor(CARD_H * 0.2)}px "Space Grotesk"`;
    ctx.textAlign = 'right';
    ctx.fillText(j.puntos + ' pts', x + cardW - 12, y + CARD_H * 0.35);
  };

  for (let i = 0; i < colIzq.length; i++) {
    await dibujarJugador(colIzq[i], PADDING, START_Y + i * ROW_H, COL_W - PADDING - 8);
  }
  for (let i = 0; i < colDer.length; i++) {
    await dibujarJugador(colDer[i], COL_W + 8, START_Y + i * ROW_H, COL_W - PADDING - 8);
  }

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
    const file = new File([blob], `once_ideal_J${jornada}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `Once ideal J${jornada} · AsturFantasy` });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `once_ideal_J${jornada}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
}

async function cargarRentable(jornada) {
  const container = document.getElementById('rentable-container');
  container.innerHTML = '<div style="text-align:center;padding:28px;color:var(--text-muted)">Cargando...</div>';
  const { data, error } = await db.from('jugadores').select('nombre, club, posicion, puntos, valor, escudo_url, foto_url').eq('jornada', jornada).neq('posicion', 'ENT').gt('valor', 0).gt('puntos', 0).order('puntos', { ascending: false });
  const { data: entData } = await db.from('jugadores').select('nombre, club, posicion, puntos, valor, escudo_url, foto_url').eq('jornada', jornada).eq('posicion', 'ENT').gt('puntos', 0).order('puntos', { ascending: false }).limit(1);
  const entrenador = entData?.length ? [{ ...entData[0], rentabilidad: entData[0].puntos / (entData[0].valor || 1) }] : [];
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
  const filas = [{ label:'🧤 PORTERO', pos:'POR', jugadores:portero },{ label:'🛑 DEFENSAS', pos:'DEF', jugadores:defOnce },{ label:'🧠 MEDIOS', pos:'MED', jugadores:medOnce },{ label:'⚽ DELANTEROS', pos:'DEL', jugadores:delOnce },{ label:'👔 ENTRENADOR', pos:'ENT', jugadores:entrenador }];
  const costeTotal = [...portero,...defOnce,...medOnce,...delOnce,...entrenador].reduce((acc,j)=>acc+(j.valor||0),0);
  const puntosTotal = [...portero,...defOnce,...medOnce,...delOnce,...entrenador].reduce((acc,j)=>acc+j.puntos,0);
  const formacion = defOnce.length + '-' + medOnce.length + '-' + delOnce.length;
  const posColor = { POR:'#e3b341', DEF:'#5b9cf6', MED:'#4cd97b', DEL:'#f05e5e', ENT:'#a78bfa' };

  const todosJugadores = [...portero, ...defOnce, ...medOnce, ...delOnce, ...entrenador];
  window._rentableData = { jornada, jugadores: todosJugadores.map(j => ({ ...j, puntos: j.puntos })), totalPuntos: puntosTotal };

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--neon);letter-spacing:2px">Formación: ${formacion}</div>
      <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">
        <div>COSTE: <strong style="color:var(--amber)">${costeTotal.toFixed(1)}M</strong></div>
        <div>PUNTOS: <strong style="color:var(--neon)">${puntosTotal} pts</strong></div>
      </div>
    </div>
    ${filas.map(fila => fila.jugadores.length === 0 ? '' : `
      <div style="margin-bottom:14px">
        <div style="font-family:var(--font-display);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border);padding-bottom:5px;margin-bottom:8px">${fila.label}</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${fila.jugadores.map(j => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--surface);border-radius:8px">
              <div style="width:10px;height:10px;border-radius:50%;background:${posColor[fila.pos]};flex-shrink:0"></div>
              ${j.escudo_url ? '<img loading="lazy" src="' + j.escudo_url + '" width="20" height="20" style="object-fit:contain;flex-shrink:0">' : ''}
              <div style="flex:1;font-family:var(--font-display);font-weight:600;font-size:13px;color:var(--text)">${j.nombre}</div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">${j.club} · ${j.valor}M</div>
              <div style="text-align:right">
                <div style="font-family:var(--font-display);font-weight:700;font-size:16px;color:var(--neon)">${j.puntos} pts</div>
                <div style="font-family:var(--font-mono);font-size:10px;color:var(--amber)">${j.rentabilidad.toFixed(2)} pts/M</div>
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('')}
    <button onclick="compartirOnceRentable()" style="width:100%;margin-top:16px;padding:10px;background:var(--green-brand);color:white;border:none;border-radius:10px;font-family:var(--font-display);font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px"><i class="ti ti-share"></i> Compartir once rentable</button>`;
}

async function compartirOnceRentable() {
  const data = window._rentableData;
  if (!data) { showToast('Sin datos para compartir'); return; }

  const { jornada, jugadores, totalPuntos } = data;

  const mitad = Math.ceil(jugadores.length / 2);
  const colIzq = jugadores.slice(0, mitad);
  const colDer = jugadores.slice(mitad);

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

  const HEADER_H = 140;

  ctx.font = 'bold 36px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('ASTUR', 40, 48);
  ctx.fillStyle = '#007a45';
  ctx.fillText('FANTASY', 40 + ctx.measureText('ASTUR').width, 48);

  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#007a45';
  ctx.fillText(totalPuntos, SIZE - 40, 55);
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('puntos totales', SIZE - 40, 90);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Más rentables · J${jornada}`, 40, 88);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '13px monospace';
  ctx.fillText('Mejor ratio puntos/valor', 40, 118);

  const gradH = ctx.createLinearGradient(0, 0, SIZE, 0);
  gradH.addColorStop(0, 'transparent');
  gradH.addColorStop(0.5, 'rgba(0,122,69,0.5)');
  gradH.addColorStop(1, 'transparent');
  ctx.strokeStyle = gradH;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HEADER_H);
  ctx.lineTo(SIZE, HEADER_H);
  ctx.stroke();

  const PADDING = 32;
  const COL_W = SIZE / 2;
  const filas = Math.max(colIzq.length, colDer.length);
  const AVAILABLE_H = SIZE - HEADER_H - 70;
  const ROW_H = Math.floor(AVAILABLE_H / filas);
  const CARD_H = ROW_H - 16;
  const START_Y = HEADER_H + 10;

  const dibujarJugador = async (j, x, y, cardW) => {
    const fotoImg   = await cargarImg(j.foto_url);
    const escudoImg = await cargarImg(j.escudo_url);

    ctx.fillStyle = '#007a45';
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, CARD_H, 10);
    ctx.fill();

    const r = Math.floor(CARD_H * 0.38);
    const cx = x + 14 + r;
    const cy = y + CARD_H / 2;

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
      ctx.font = `bold ${Math.floor(r * 0.6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(j.nombre.substring(0,2).toUpperCase(), cx, cy);
    }

    if (escudoImg) {
      const er = Math.floor(r * 0.35);
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

    const txtX = x + 14 + r * 2 + 12;

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(CARD_H * 0.22)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(j.nombre, txtX, y + CARD_H * 0.18);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${Math.floor(CARD_H * 0.16)}px monospace`;
    ctx.fillText(`${j.posicion} · ${j.club} · ${j.valor}M`, txtX, y + CARD_H * 0.48);

    ctx.fillStyle = '#00d97e';
    ctx.font = `bold ${Math.floor(CARD_H * 0.2)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(j.puntos + ' pts', x + cardW - 12, y + CARD_H * 0.35);
  };

  for (let i = 0; i < colIzq.length; i++) {
    await dibujarJugador(colIzq[i], PADDING, START_Y + i * ROW_H, COL_W - PADDING - 8);
  }
  for (let i = 0; i < colDer.length; i++) {
    await dibujarJugador(colDer[i], COL_W + 8, START_Y + i * ROW_H, COL_W - PADDING - 8);
  }

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
    const file = new File([blob], `rentables_J${jornada}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `Más rentables J${jornada} · AsturFantasy` });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rentables_J${jornada}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
}