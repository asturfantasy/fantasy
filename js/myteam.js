/* ============================================================
   js/myteam.js  —  Mi equipo
   ============================================================ */

async function mostrarDesgloseMyTeam(jugadorId, nombre, posicion, jornada) {
  if (!jornada) jornada = JORNADA_VISIBLE;
  const modal = document.getElementById('modal-desglose');
  const content = document.getElementById('desglose-content');
  document.getElementById('desglose-titulo').textContent = nombre;
  modal.classList.add('open');
  const { data, error } = await db.from('jugadores').select('minutos, puerta_cero, lne, gol, asistencia, penalti_marcado, penalti_fallado, gol_pp, amarilla, doble_amarilla, roja, total_jornada, puntos_entrenador, goles_encajados').eq('id', jugadorId).eq('jornada', jornada).single();
  if (error || !data) { content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin datos</div>'; return; }
  const items = desgloseFn({ ...data, posicion, nombre });
  content.innerHTML = items.map(item => '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-family:var(--font-body);font-size:13px;color:var(--text-muted)">' + item.label + '</span><span style="font-family:var(--font-display);font-weight:700;font-size:15px;color:' + (item.pts >= 0 ? 'var(--neon)' : 'var(--red)') + '">' + (item.pts > 0 ? '+' : '') + item.pts + '</span></div>').join('') +
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;margin-top:4px"><span style="font-family:var(--font-display);font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:var(--text)">Total</span><span style="font-family:var(--font-display);font-weight:700;font-size:24px;color:var(--neon)">' + data.total_jornada + '</span></div>';
}

async function loadMyTeam() {
  if (!currentUser) return;
  const selectMyTeam = document.getElementById('myteam-jornada-select');
  const deadlinePasado = jornadadCerrada();
  const jornadaMax = deadlinePasado ? JORNADA_ACTIVA : JORNADA_VISIBLE;

  if (selectMyTeam) {
    selectMyTeam.innerHTML = '';
    for (let i = jornadaMax; i >= 1; i--) {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = i === jornadaMax ? 'J' + i + ' · Actual' : 'J' + i;
      selectMyTeam.appendChild(opt);
    }
    selectMyTeam.value = jornadaMax;
    selectMyTeam.onchange = e => cargarMyTeam(parseInt(e.target.value));
  }
  await cargarMyTeam(jornadaMax);
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
  const { data: jugData } = await db.from('jugadores').select('id, escudo_url, foto_url, valor, activo').in('id', ids);
  const escudoMap = {}, fotoMap = {}, valorMap = {}, activoMap = {};
  (jugData || []).forEach(j => { escudoMap[j.id] = j.escudo_url; fotoMap[j.id] = j.foto_url; valorMap[j.id] = j.valor; activoMap[j.id] = j.activo; });
  const { data: capData } = await db.from('mi_equipo').select('jugador_id').eq('user_id', currentUser.id).eq('jornada', jornada).eq('capitan', true).single();
  const capitanId = capData?.jugador_id || null;
  const orden = ['POR','DEF','MED','DEL','ENT'];
  const sorted = [...data].sort((a,b) => orden.indexOf(a.posicion) - orden.indexOf(b.posicion));
  const totalPuntos = sorted.reduce((acc, j) => { const pts = j.puntos || 0; return acc + (j.jugador_id === capitanId ? pts * 2 : pts); }, 0);
  const formacion = data[0]?.formacion || '—';
  const { data: mediaData } = await db.from('clasificacion_automatica').select('puntos').eq('jornada', jornada);
  const media = mediaData?.length ? Math.round(mediaData.reduce((acc, r) => acc + r.puntos, 0) / mediaData.length) : 0;

  banner.style.display = 'block';
  banner.innerHTML =
    '<div class="saved-sub" style="text-align:center">Formación <strong>' + formacion + '</strong> · Jornada ' + jornada + '</div>' +
    '<div class="saved-pts-high" style="text-align:center"><strong>' + totalPuntos + ' PUNTOS</strong></div>' +
    '<div class="saved-sub" style="text-align:center;margin-top:6px">Media de la jornada: <strong>' + media + ' pts</strong></div>' +
    '<button onclick="compartirEquipo()" style="width:100%;margin-top:12px;padding:10px;background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:10px;font-family:var(--font-display);font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px"><i class="ti ti-share"></i> Compartir mi equipo</button>';

  grid.innerHTML = sorted.map(j => {
    const foto = fotoMap[j.jugador_id];
    const escudo = escudoMap[j.jugador_id];
    const esC = j.jugador_id === capitanId;
    const pts = esC ? j.puntos * 2 : j.puntos;
    const inactivo = activoMap[j.jugador_id] === 0 || activoMap[j.jugador_id] === '0';
    const avatar = foto ? '<img loading="lazy" src="' + foto + '" width="40" height="40" style="object-fit:cover;border-radius:50%" onerror="this.style.display=\'none\'">' : j.nombre.substring(0,2).toUpperCase();
    return '<div class="player-card ' + (esC ? 'card-capitan' : '') + '" style="cursor:pointer' + (inactivo ? ';border:1px solid rgba(240,94,94,0.5);' : '') + '" onclick="mostrarDesgloseMyTeam(\'' + j.jugador_id + '\',\'' + j.nombre + '\',\'' + j.posicion + '\',' + jornada + ')">' +
      '<div class="pc-avatar" style="position:relative;background:' + POS_COLORS[j.posicion] + ';color:' + POS_TEXT[j.posicion] + ';overflow:visible">' +
        avatar +
        (inactivo ? '<div style="position:absolute;inset:0;border-radius:50%;background:rgba(240,94,94,0.4);"></div>' : '') +
        (escudo ? '<img loading="lazy" src="' + escudo + '" width="14" height="14" style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;border-radius:50%;background:white;border:1px solid rgba(0,0,0,0.2)">' : '') +
      '</div>' +
      '<div class="pc-info">' +
        '<div class="pc-name">' + j.nombre + (esC ? ' ⭐' : '') + '</div>' +
        '<div class="pc-meta">' + j.posicion + ' · ' + j.club + ' · ' + (valorMap[j.jugador_id] || 0) + 'M' + (esC ? ' · Cap.' : '') + '</div>' +
      '</div>' +
      '<div class="pc-pts">' + pts + '</div>' +
    '</div>';
  }).join('');

  const { data: ed } = await db.from('equipos').select('nombre_equipo').eq('user_id', currentUser.id).single();
  const inp = document.getElementById('input-nombre-equipo');
  if (inp && ed?.nombre_equipo) inp.value = ed.nombre_equipo;
}

async function compartirEquipo() {
  const banner = document.getElementById('myteam-banner');
  const grid   = document.getElementById('myteam-grid');
  const jornada = document.getElementById('myteam-jornada-num').textContent;

  const { data: ed } = await db.from('equipos').select('nombre_equipo').eq('user_id', currentUser.id).single();
  const nombreEquipo = ed?.nombre_equipo || 'Mi equipo';

  const ptsMatch   = banner.innerHTML.match(/(\d+) PUNTOS/);
  const mediaMatch = banner.innerHTML.match(/Media de la jornada: <strong>(\d+)/);
  const totalPuntos = ptsMatch ? ptsMatch[1] : '—';
  const media = mediaMatch ? mediaMatch[1] : '—';

  const cards = grid.querySelectorAll('.player-card');
  const jugadores = Array.from(cards).map(card => {
    const nombreEl = card.querySelector('.pc-name');
    const esCapitan = nombreEl?.textContent?.includes('⭐') || false;
    const nombre = nombreEl?.textContent?.replace(' ⭐','').trim() || '';
    const meta   = card.querySelector('.pc-meta')?.textContent?.trim() || '';
    const pts    = card.querySelector('.pc-pts')?.textContent?.trim() || '0';
    const pos    = meta.split(' · ')[0] || '';
    return { nombre, pts, pos, esCapitan };
  });

  const { data: clGeneral } = await db.from('clasificacion_general_auto').select('user_id, puntos_total');
  const sorted = (clGeneral || []).sort((a,b) => b.puntos_total - a.puntos_total);
  const miPos  = sorted.findIndex(r => r.user_id === currentUser.id);
  const posicion = miPos >= 0 ? (miPos + 1) + 'º' : '—';

  const posColor = { POR: '#e3b341', DEF: '#5b9cf6', MED: '#4cd97b', DEL: '#f05e5e', ENT: '#a78bfa' };

  const tarjeta = document.createElement('div');
  tarjeta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:360px;background:#007a45;border-radius:16px;overflow:hidden;font-family:Space Grotesk,sans-serif;padding:20px;background-image:repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(0,0,0,0.06) 40px,rgba(0,0,0,0.06) 80px),repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(0,0,0,0.06) 40px,rgba(0,0,0,0.06) 80px)';

  tarjeta.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">' +
      '<img src="https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/logo_asturfantasy_redondo.png" width="28" height="28" style="border-radius:8px">' +
      '<span style="color:white;font-weight:700;font-size:14px">Astur<span style="color:#4cd97b">Fantasy</span></span>' +
      '<span style="margin-left:auto;font-size:11px;color:rgba(255,255,255,0.6)">J' + jornada + '</span>' +
    '</div>' +
    '<div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:2px">' + nombreEquipo + '</div>' +
    '<div style="font-size:48px;font-weight:900;color:white;line-height:1;letter-spacing:-2px;margin-bottom:4px">' + totalPuntos + ' <span style="font-size:20px;font-weight:500">pts</span></div>' +
    '<div style="font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:16px">Media: ' + media + ' pts · ' + posicion + ' general</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
      jugadores.map(j =>
        '<div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:8px;display:flex;align-items:center;justify-content:space-between;gap:4px' + (j.esCapitan ? ';border:1px solid rgba(227,179,65,0.4)' : '') + '">' +
          '<div style="display:flex;align-items:center;gap:6px;min-width:0">' +
            '<div style="width:8px;height:8px;border-radius:50%;background:' + (posColor[j.pos] || '#fff') + ';flex-shrink:0"></div>' +
            '<span style="font-size:11px;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + j.nombre + '</span>' +
            (j.esCapitan ? '<span style="background:rgba(227,179,65,0.3);color:#e3b341;border-radius:4px;padding:1px 4px;font-size:9px;font-weight:700;flex-shrink:0">C</span>' : '') +
          '</div>' +
          '<span style="font-size:14px;font-weight:700;color:#4cd97b;flex-shrink:0">' + j.pts + '</span>' +
        '</div>'
      ).join('') +
    '</div>' +
    '<div style="margin-top:14px;text-align:center;font-size:10px;color:rgba(255,255,255,0.4)">asturfantasy.com</div>';

  document.body.appendChild(tarjeta);

  try {
    const canvas = await html2canvas(tarjeta, {
      backgroundColor: '#007a45',
      scale: 2,
      useCORS: true,
    });

    document.body.removeChild(tarjeta);

    canvas.toBlob(async blob => {
      const file = new File([blob], nombreEquipo + '_J' + jornada + '.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: nombreEquipo + ' · AsturFantasy J' + jornada });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreEquipo + '_J' + jornada + '.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch (e) {
    if (document.body.contains(tarjeta)) document.body.removeChild(tarjeta);
    showToast('Error al compartir');
  }
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
