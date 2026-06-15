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
  const { mvp, jornada } = window._mvpData;

  const tarjeta = document.createElement('div');
  tarjeta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:360px;background:#007a45;border-radius:16px;overflow:hidden;font-family:Space Grotesk,sans-serif;padding:20px;background-image:repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(0,0,0,0.06) 40px,rgba(0,0,0,0.06) 80px),repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(0,0,0,0.06) 40px,rgba(0,0,0,0.06) 80px)';

  tarjeta.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">' +
      '<img src="https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/logo_asturfantasy_redondo.png" width="24" height="24" style="border-radius:6px">' +
      '<span style="color:white;font-weight:700;font-size:13px">Astur<span style="color:rgba(255,255,255,0.7)">Fantasy</span></span>' +
      '<span style="margin-left:auto;font-size:11px;color:rgba(255,255,255,0.6)">J' + jornada + ' · MVP</span>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">' +
      '<div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:white;flex-shrink:0;overflow:hidden">' +
        (mvp.foto_url ? '<img src="' + mvp.foto_url + '" width="64" height="64" style="object-fit:cover;border-radius:50%">' : mvp.nombre.substring(0,2).toUpperCase()) +
      '</div>' +
      '<div>' +
        '<div style="font-size:9px;color:rgba(255,255,255,0.6);letter-spacing:2px;margin-bottom:2px">MVP JORNADA ' + jornada + '</div>' +
        '<div style="font-size:22px;font-weight:800;color:white;line-height:1.1">' + mvp.nombre + '</div>' +
        '<div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px">' + mvp.posicion + ' · ' + mvp.club + '</div>' +
      '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px">' +
      '<div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:900;color:white">' + mvp.puntos + '</div><div style="font-size:8px;color:rgba(255,255,255,0.5);letter-spacing:1px">PTS</div></div>' +
      '<div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:900;color:white">' + (mvp.minutos||0) + '</div><div style="font-size:8px;color:rgba(255,255,255,0.5);letter-spacing:1px">MIN</div></div>' +
      '<div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:900;color:white">' + ((mvp.gol||0) + (mvp.penalti_marcado||0)) + '</div><div style="font-size:8px;color:rgba(255,255,255,0.5);letter-spacing:1px">GOLES</div></div>' +
      '<div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:900;color:white">' + (mvp.asistencia||0) + '</div><div style="font-size:8px;color:rgba(255,255,255,0.5);letter-spacing:1px">ASIST.</div></div>' +
    '</div>' +
    '<div style="text-align:center;font-size:10px;color:rgba(255,255,255,0.4)">asturfantasy.com</div>';

  document.body.appendChild(tarjeta);
  try {
    const canvas = await html2canvas(tarjeta, { backgroundColor: '#007a45', scale: 2, useCORS: true });
    document.body.removeChild(tarjeta);
    canvas.toBlob(async blob => {
      const file = new File([blob], 'MVP_J' + jornada + '_' + mvp.nombre + '.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'MVP J' + jornada + ': ' + mvp.nombre + ' · AsturFantasy' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'MVP_J' + jornada + '.png'; a.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch(e) {
    if (document.body.contains(tarjeta)) document.body.removeChild(tarjeta);
    showToast('Error al compartir');
  }
}

async function compartirClasificacion(nombreEquipo, posicion, puntos, tipo, club, ligaId, ligaNombre) {
  // Obtener datos completos según el tipo
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
  } else {
    const { data } = await db.from('clasificacion_general_auto').select('*');
    tabla = (data || []).map((r, i) => ({ pos: i+1, nombre: r.nombre_equipo, pts: r.puntos_total, esYo: r.user_id === currentUser?.id }));
    titulo = 'Clasificación general';
    subtitulo = 'AsturFantasy';
  }
  if (tipo === 'liga') {
    const ligaId = arguments[5];
    const ligaNombre = arguments[6];
    const { data: miembros } = await db.from('liga_miembros').select('user_id').eq('liga_id', ligaId);
    const userIds = (miembros || []).map(m => m.user_id);
    const { data } = await db.from('clasificacion_general_auto').select('*').in('user_id', userIds);
    tabla = (data || []).sort((a,b) => b.puntos_total - a.puntos_total).map((r,i) => ({ pos: i+1, nombre: r.nombre_equipo, pts: r.puntos_total, esYo: r.user_id === currentUser?.id }));
    titulo = ligaNombre;
    subtitulo = 'Liga privada';
  }

  const top10 = tabla.slice(0, 10);
  const yo = tabla.find(r => r.esYo);
  const yoEnTop10 = yo && yo.pos <= 10;

  const medalColor = (pos) => pos === 1 ? '#e3b341' : pos === 2 ? '#8b949e' : pos === 3 ? '#cd7f32' : 'rgba(255,255,255,0.3)';

  const filaHtml = (r, destacado = false) =>
    '<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;' + (destacado ? 'background:rgba(0,217,126,0.12);border-radius:6px;' : '') + '">' +
      '<div style="width:20px;font-family:monospace;font-size:11px;font-weight:700;color:' + medalColor(r.pos) + ';flex-shrink:0;text-align:right">' + r.pos + '</div>' +
      '<div style="flex:1;font-size:11px;color:' + (destacado ? '#4cd97b' : 'white') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + r.nombre + '</div>' +
      '<div style="font-size:12px;font-weight:700;color:' + (destacado ? '#4cd97b' : 'white') + ';flex-shrink:0">' + r.pts + '</div>' +
    '</div>';

  const tarjeta = document.createElement('div');
  tarjeta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:360px;background:#111816;border-radius:16px;overflow:hidden;font-family:Space Grotesk,sans-serif;padding:20px;border:1px solid rgba(76,217,123,0.2)';

  tarjeta.innerHTML =
    // Header
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">' +
      '<img src="https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/logo_asturfantasy_redondo.png" width="22" height="22" style="border-radius:6px">' +
      '<span style="color:white;font-weight:700;font-size:12px">Astur<span style="color:#4cd97b">Fantasy</span></span>' +
      '<span style="margin-left:auto;font-size:10px;color:rgba(255,255,255,0.4)">' + subtitulo + '</span>' +
    '</div>' +
    // Título
    '<div style="font-size:15px;font-weight:800;color:white;margin-bottom:12px">' + titulo + '</div>' +
    // Top 10
    '<div style="display:flex;flex-direction:column;gap:2px;margin-bottom:' + (!yoEnTop10 && yo ? '8px' : '14px') + '">' +
      top10.map(r => filaHtml(r, r.esYo)).join('') +
    '</div>' +
    // Mi posición si no estoy en top 10
    (!yoEnTop10 && yo
      ? '<div style="border-top:1px dashed rgba(255,255,255,0.1);padding-top:8px;margin-bottom:14px">' +
          '<div style="font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:1px;margin-bottom:4px;padding-left:12px">TU POSICIÓN</div>' +
          filaHtml(yo, true) +
        '</div>'
      : '') +
    // Footer
    '<div style="text-align:center;font-size:9px;color:#4a5e58">asturfantasy.com</div>';

  document.body.appendChild(tarjeta);
  try {
    const canvas = await html2canvas(tarjeta, { backgroundColor: '#111816', scale: 2, useCORS: true });
    document.body.removeChild(tarjeta);
    canvas.toBlob(async blob => {
      const file = new File([blob], 'clasificacion_' + (tipo || 'general') + '.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: titulo + ' · AsturFantasy' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'clasificacion.png'; a.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch(e) {
    if (document.body.contains(tarjeta)) document.body.removeChild(tarjeta);
    showToast('Error al compartir');
  }
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
    const { data } = await db.from('ranking_jugadores').select('nombre, club, posicion, escudo_url, foto_url, goles, asistencias, porterias_cero, amarillas, rojas');
    rankingDetalleData = data || [];
  }
  cambiarSubtabDetalle('goles');
}

function cambiarSubtabDetalle(subtab) {
  document.querySelectorAll('.ranking-subtab').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-subtab="' + subtab + '"]')?.classList.add('active');

  const campos = {
    goles:       { campo: 'goles',         label: 'Goles',          icono: '⚽' },
    asistencias: { campo: 'asistencias',   label: 'Asistencias',    icono: '👟' },
    porterias:   { campo: 'porterias_cero', label: 'Port. a cero',  icono: '🔒' },
    amarillas:   { campo: 'amarillas',     label: 'Amarillas',      icono: '🟨' },
    rojas:       { campo: 'rojas',         label: 'Rojas',          icono: '🟥' },
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

  // Posición general
  const { data: generalAll } = await db.from('clasificacion_general_auto').select('user_id, puntos_total').order('puntos_total', { ascending: false });
  const posGeneral = (generalAll || []).findIndex(r => r.user_id === currentUser.id) + 1;
  const totalPuntos = (generalAll || []).find(r => r.user_id === currentUser.id)?.puntos_total || 0;

  // Posición semanal última jornada visible
  const ultimaJornadaClasif = misJornadas.length ? misJornadas[misJornadas.length - 1].jornada : null;
  const ptsSemanal = ultimaJornadaClasif ? misJornadas.find(j => j.jornada === ultimaJornadaClasif)?.puntos || 0 : 0;
  const posSemanal = ultimaJornadaClasif
    ? todas.filter(j => j.jornada === ultimaJornadaClasif).sort((a,b) => b.puntos - a.puntos).findIndex(j => j.user_id === currentUser.id) + 1
    : 0;

  // Pintar posiciones destacadas
  document.getElementById('perfil-pos-general').textContent = posGeneral ? '#' + posGeneral : '—';
  document.getElementById('perfil-pts-total').textContent = totalPuntos + ' pts totales';
  document.getElementById('perfil-pos-semanal').textContent = posSemanal ? '#' + posSemanal : '—';
  document.getElementById('perfil-pts-semanal').textContent = ultimaJornadaClasif ? ptsSemanal + ' pts · J' + ultimaJornadaClasif : '—';

  // Jornadas consecutivas en top 10
  const jornadasUnicas = [...new Set(todas.map(j => j.jornada))].sort((a,b) => a-b);
  let rachaActual = 0, rachaMax = 0, rachaTemp = 0;
  jornadasUnicas.forEach(jornada => {
    const ranking = todas.filter(j => j.jornada === jornada).sort((a,b) => b.puntos - a.puntos);
    const pos = ranking.findIndex(j => j.user_id === currentUser.id) + 1;
    if (pos > 0 && pos <= 10) { rachaTemp++; rachaMax = Math.max(rachaMax, rachaTemp); }
    else { rachaTemp = 0; }
  });
  for (let i = jornadasUnicas.length - 1; i >= 0; i--) {
    const jornada = jornadasUnicas[i];
    const ranking = todas.filter(j => j.jornada === jornada).sort((a,b) => b.puntos - a.puntos);
    const pos = ranking.findIndex(j => j.user_id === currentUser.id) + 1;
    if (pos > 0 && pos <= 10) rachaActual++;
    else break;
  }

  // Jugador más usado y capitán más usado
  const { data: misEquipos } = await db.from('mi_equipo').select('jugador_id, jornada, capitan').eq('user_id', currentUser.id);
  const { data: jugadoresInfo } = await db.from('jugadores').select('id, nombre, club, jornada, total_jornada').order('jornada', { ascending: false });

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

  // Capitán más usado
  const capitanesData = (misEquipos || []).filter(e => e.capitan === true || e.capitan === 1);
  const contCapitanes = {};
  capitanesData.forEach(e => { contCapitanes[e.jugador_id] = (contCapitanes[e.jugador_id] || 0) + 1; });
  const masCapitanId = Object.entries(contCapitanes).sort((a,b) => b[1] - a[1])[0];
  let masCapitanNombre = '—', masCapitanVeces = 0;
  if (masCapitanId) {
    masCapitanVeces = masCapitanId[1];
    const jugCapitan = (jugadoresInfo || []).find(j => j.id === masCapitanId[0]);
    masCapitanNombre = jugCapitan?.nombre || '—';
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

  // Pintar estadísticas
  const stats = [
    { label: 'Mejor jornada', value: mejorJornada + ' pts', sub: 'J' + mejorJornadaNum, color: 'var(--neon)' },
    { label: 'Peor jornada', value: peorJornada + ' pts', sub: misJornadas.find(j => j.puntos === peorJornada)?.jornada ? 'J' + misJornadas.find(j => j.puntos === peorJornada)?.jornada : '—', color: 'var(--red)' },
    { label: 'Media por jornada', value: media + ' pts', sub: puntosPorJornada.length + ' jornadas', color: 'var(--amber)' },
    { label: 'Racha top 10', value: rachaActual + ' jornadas', sub: 'Máx. ' + rachaMax, color: 'var(--amber)' },
    { label: 'Jugador más usado', value: masUsadoNombre, sub: masUsadoVeces + ' jornadas', color: 'white' },
    { label: 'Jugador agradecido', value: agradecido?.nombre || '—', sub: agradecido ? (agradecido.pts/agradecido.veces).toFixed(1) + ' pts/jornada' : '—', color: 'white' },
    //{ label: 'Capitán más usado', value: masCapitanNombre, sub: masCapitanVeces + ' veces', color: 'var(--amber)' },
  ];

  document.getElementById('perfil-stats').innerHTML = stats.map(s =>
    '<div style="background:var(--surface);border-radius:10px;padding:12px">' +
      '<div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">' + s.label + '</div>' +
      '<div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:' + s.color + '">' + s.value + '</div>' +
      '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:2px">' + s.sub + '</div>' +
    '</div>'
  ).join('');

  // Logros
  const victoriaJornada = misJornadas.some(j => {
    const ranking = todas.filter(t => t.jornada === j.jornada).sort((a,b) => b.puntos - a.puntos);
    return ranking[0]?.user_id === currentUser.id;
  });

  const logros = [
    { icono: '🏆', titulo: 'Primera victoria', desc: 'Ganar una jornada', desbloqueado: victoriaJornada },
    { icono: '🔥', titulo: 'En racha', desc: '3 jornadas seguidas en top 10', desbloqueado: rachaMax >= 3 },
    { icono: '🎯', titulo: 'Capitán acertado', desc: 'Tu capitán fue el MVP de la jornada', desbloqueado: false },
  ];

  document.getElementById('perfil-logros').innerHTML = logros.map(l =>
    '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--surface);border-radius:10px;' + (!l.desbloqueado ? 'opacity:0.4;' : 'border:1px solid rgba(76,217,123,0.2);') + '">' +
      '<div style="font-size:24px;flex-shrink:0">' + l.icono + '</div>' +
      '<div style="flex:1">' +
        '<div style="font-family:var(--font-display);font-size:13px;font-weight:600;color:' + (l.desbloqueado ? 'var(--text)' : 'var(--text-muted)') + '">' + l.titulo + '</div>' +
        '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:2px">' + l.desc + '</div>' +
      '</div>' +
      (l.desbloqueado ? '<i class="ti ti-check" style="color:var(--neon);font-size:18px"></i>' : '<i class="ti ti-lock" style="color:var(--text-muted);font-size:16px"></i>') +
    '</div>'
  ).join('');
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
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">${j.club} · ${j.valor}M</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--font-display);font-weight:700;font-size:18px;color:var(--neon)">${j.puntos} pts</div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--amber)">${j.rentabilidad.toFixed(2)} pts/M</div>
            </div>
          </div>`).join('')}
      </div>`).join('')}`;
}

/* ============================================================
   compartirOnce.js — Compartir Once Ideal y Once Rentable
   ============================================================ */

async function compartirOnceIdeal() {
  const { jornada, portero, defOnce, medOnce, delOnce, entrenador, totalPuntos } = window._onceIdealData;
  const formacion = defOnce.length + '-' + medOnce.length + '-' + delOnce.length;
  const filas = [
    { label: 'PORTERO', pos: 'POR', jugadores: portero },
    { label: 'DEFENSAS', pos: 'DEF', jugadores: defOnce },
    { label: 'MEDIOS', pos: 'MED', jugadores: medOnce },
    { label: 'DELANTEROS', pos: 'DEL', jugadores: delOnce },
    { label: 'ENTRENADOR', pos: 'ENT', jugadores: entrenador }
  ];
  const posColor = { POR:'#e3b341', DEF:'#5b9cf6', MED:'#4cd97b', DEL:'#f05e5e', ENT:'#a78bfa' };

  const tarjeta = document.createElement('div');
  tarjeta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:360px;background:#111816;border-radius:16px;overflow:hidden;font-family:Space Grotesk,sans-serif;padding:20px;border:1px solid rgba(76,217,123,0.2)';

  tarjeta.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">' +
      '<img src="https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/logo_asturfantasy_redondo.png" width="24" height="24" style="border-radius:6px">' +
      '<span style="color:white;font-weight:700;font-size:13px">Astur<span style="color:#4cd97b">Fantasy</span></span>' +
      '<span style="margin-left:auto;font-size:11px;color:rgba(255,255,255,0.5)">J' + jornada + ' · Once ideal</span>' +
    '</div>' +
    '<div style="font-size:10px;color:#4cd97b;letter-spacing:2px;font-weight:600;margin-bottom:12px">FORMACIÓN ' + formacion + ' · ' + totalPuntos + ' PTS</div>' +
    filas.map(fila => fila.jugadores.length === 0 ? '' :
      '<div style="margin-bottom:10px">' +
        '<div style="font-size:9px;color:#4a5e58;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">' + fila.label + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:3px">' +
          fila.jugadores.map(j =>
            '<div style="background:#1a2420;border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px">' +
              '<div style="width:10px;height:10px;border-radius:50%;background:' + posColor[fila.pos] + ';flex-shrink:0"></div>' +
              (j.escudo_url ? '<img src="' + j.escudo_url + '" width="16" height="16" style="object-fit:contain;flex-shrink:0">' : '') +
              '<span style="font-size:12px;font-weight:600;color:white;flex:1">' + j.nombre + '</span>' +
              '<span style="font-size:9px;color:#7a9088">' + j.club + '</span>' +
              '<span style="font-size:16px;font-weight:800;color:#4cd97b;min-width:24px;text-align:right">' + j.puntos + '</span>' +
            '</div>'
          ).join('') +
        '</div>' +
      '</div>'
    ).join('') +
    '<div style="margin-top:12px;text-align:center;font-size:10px;color:#4a5e58">asturfantasy.com</div>';

  document.body.appendChild(tarjeta);
  try {
    const canvas = await html2canvas(tarjeta, { backgroundColor: '#111816', scale: 2, useCORS: true });
    document.body.removeChild(tarjeta);
    canvas.toBlob(async blob => {
      const file = new File([blob], 'once_ideal_J' + jornada + '.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Once ideal J' + jornada + ' · AsturFantasy' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'once_ideal_J' + jornada + '.png'; a.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch(e) {
    if (document.body.contains(tarjeta)) document.body.removeChild(tarjeta);
    showToast('Error al compartir');
  }
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

  window._onceRentableData = { jornada, portero, defOnce, medOnce, delOnce, entrenador, costeTotal, puntosTotal };

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
  const { jornada, portero, defOnce, medOnce, delOnce, entrenador, costeTotal, puntosTotal } = window._onceRentableData;
  const formacion = defOnce.length + '-' + medOnce.length + '-' + delOnce.length;
  const filas = [
    { label: 'PORTERO', pos: 'POR', jugadores: portero },
    { label: 'DEFENSAS', pos: 'DEF', jugadores: defOnce },
    { label: 'MEDIOS', pos: 'MED', jugadores: medOnce },
    { label: 'DELANTEROS', pos: 'DEL', jugadores: delOnce },
    { label: 'ENTRENADOR', pos: 'ENT', jugadores: entrenador }
  ];
  const posColor = { POR:'#e3b341', DEF:'#5b9cf6', MED:'#4cd97b', DEL:'#f05e5e', ENT:'#a78bfa' };

  const tarjeta = document.createElement('div');
  tarjeta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:360px;background:#111816;border-radius:16px;overflow:hidden;font-family:Space Grotesk,sans-serif;padding:20px;border:1px solid rgba(227,179,65,0.2)';

  tarjeta.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">' +
      '<img src="https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/logo_asturfantasy_redondo.png" width="24" height="24" style="border-radius:6px">' +
      '<span style="color:white;font-weight:700;font-size:13px">Astur<span style="color:#4cd97b">Fantasy</span></span>' +
      '<span style="margin-left:auto;font-size:11px;color:rgba(255,255,255,0.5)">J' + jornada + ' · Once rentable</span>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">' +
      '<div style="background:#1a2420;border-radius:8px;padding:10px;text-align:center">' +
        '<div style="font-size:9px;color:#7a9088;letter-spacing:1px;margin-bottom:2px">COSTE</div>' +
        '<div style="font-size:20px;font-weight:800;color:#e3b341">' + costeTotal.toFixed(1) + 'M</div>' +
      '</div>' +
      '<div style="background:#1a2420;border-radius:8px;padding:10px;text-align:center">' +
        '<div style="font-size:9px;color:#7a9088;letter-spacing:1px;margin-bottom:2px">PUNTOS</div>' +
        '<div style="font-size:20px;font-weight:800;color:#4cd97b">' + puntosTotal + '</div>' +
      '</div>' +
    '</div>' +
    filas.map(fila => fila.jugadores.length === 0 ? '' :
      '<div style="margin-bottom:10px">' +
        '<div style="font-size:9px;color:#4a5e58;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">' + fila.label + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:3px">' +
          fila.jugadores.map(j =>
            '<div style="background:#1a2420;border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px">' +
              '<div style="width:10px;height:10px;border-radius:50%;background:' + posColor[fila.pos] + ';flex-shrink:0"></div>' +
              (j.escudo_url ? '<img src="' + j.escudo_url + '" width="16" height="16" style="object-fit:contain;flex-shrink:0">' : '') +
              '<span style="font-size:12px;font-weight:600;color:white;flex:1">' + j.nombre + '</span>' +
              '<span style="font-size:9px;color:#7a9088">' + j.valor + 'M</span>' +
              '<span style="font-size:12px;font-weight:700;color:#e3b341;min-width:40px;text-align:right">' + j.rentabilidad.toFixed(2) + '</span>' +
            '</div>'
          ).join('') +
        '</div>' +
      '</div>'
    ).join('') +
    '<div style="margin-top:12px;text-align:center;font-size:10px;color:#4a5e58">asturfantasy.com</div>';

  document.body.appendChild(tarjeta);
  try {
    const canvas = await html2canvas(tarjeta, { backgroundColor: '#111816', scale: 2, useCORS: true });
    document.body.removeChild(tarjeta);
    canvas.toBlob(async blob => {
      const file = new File([blob], 'once_rentable_J' + jornada + '.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Once rentable J' + jornada + ' · AsturFantasy' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'once_rentable_J' + jornada + '.png'; a.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch(e) {
    if (document.body.contains(tarjeta)) document.body.removeChild(tarjeta);
    showToast('Error al compartir');
  }
}