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

  // ── Partidos de la jornada ──
  const { data: partidos } = await db
    .from('partidos')
    .select('*')
    .eq('jornada', jornada)
    .order('orden', { ascending: true });

  if (partidos?.length) {
    const contenedor = document.getElementById('myteam-partidos');
    if (contenedor) {
      contenedor.innerHTML = `
        <div class="section-label" style="margin-top:20px;margin-bottom:12px"><strong>PUNTUACIONES  J${jornada}</strong></div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
          ${partidos.map(p => {
            const localImg = p.local_escudo_url ? `<img loading="lazy" src="${p.local_escudo_url}" width="28" height="28" style="object-fit:contain">` : p.local_abrev;
            const visitanteImg = p.visitante_escudo_url ? `<img loading="lazy" src="${p.visitante_escudo_url}" width="28" height="28" style="object-fit:contain">` : p.visitante_abrev;
            return `
              <div style="background:var(--surface);border-radius:10px;padding:10px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer"
                   onclick="mostrarPartido('${p.local_abrev}','${p.visitante_abrev}','${p.local_nombre}','${p.visitante_nombre}',${p.jornada})">
                <div style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:4px">
                  ${localImg}
                  <div style="flex:1;font-family:var(--font-display);font-size:10px;font-weight:600;color:var(--text);text-align:center;line-height:1.2">${p.local_abrev}</div>
                  <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:${p.finalizado ? 'var(--neon)' : 'var(--text-muted)'};white-space:nowrap">
                    ${p.finalizado ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                      <span>${p.resultado_local}-${p.resultado_visitante}</span>
                      <button onclick="event.stopPropagation();mostrarPartido('${p.local_abrev}','${p.visitante_abrev}','${p.local_nombre}','${p.visitante_nombre}',${p.jornada})"
                        style="background:var(--neon);color:#0d1117;border:none;border-radius:20px;padding:2px 8px;cursor:pointer;font-family:var(--font-display);font-weight:700;font-size:8px;letter-spacing:1px;text-transform:uppercase">
                        PUNTOS
                      </button>
                    </div>` : 'vs'}
                  </div>
                  <div style="flex:1;font-family:var(--font-display);font-size:10px;font-weight:600;color:var(--text);text-align:center;line-height:1.2">${p.visitante_abrev}</div>
                  ${visitanteImg}
                </div>
                ${!p.finalizado ? `<div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">${formatearFecha(p.fecha, p.hora)}</div>` : ''}
              </div>`;
          }).join('')}
        </div>
      `;
    }
  }

  const { data: ed } = await db.from('equipos').select('nombre_equipo').eq('user_id', currentUser.id).single();
  const inp = document.getElementById('input-nombre-equipo');
  if (inp && ed?.nombre_equipo) inp.value = ed.nombre_equipo;
}

async function compartirEquipo() {
  const jornada = document.getElementById('myteam-jornada-num').textContent;
  const { data: ed } = await db.from('equipos').select('nombre_equipo').eq('user_id', currentUser.id).single();
  const nombreEquipo = ed?.nombre_equipo || 'Mi equipo';

  const banner = document.getElementById('myteam-banner');
  const ptsMatch = banner.innerHTML.match(/(\d+) PUNTOS/);
  const mediaMatch = banner.innerHTML.match(/Media de managers: <strong>(\d+)/);
  const totalPuntos = ptsMatch ? ptsMatch[1] : '—';
  const media = mediaMatch ? mediaMatch[1] : '—';

  const cards = document.getElementById('myteam-grid').querySelectorAll('.player-card');
  const jugadores = Array.from(cards).map(card => {
    const nombreEl = card.querySelector('.pc-name');
    const esCapitan = nombreEl?.textContent?.includes('⭐') || false;
    const nombre = nombreEl?.textContent?.replace(' ⭐','').trim() || '';
    const meta = card.querySelector('.pc-meta')?.textContent?.trim() || '';
    const pts = card.querySelector('.pc-pts')?.textContent?.trim() || '0';
    const pos = meta.split(' · ')[0] || '';
    const club = meta.split(' · ')[1] || '';
    const foto = card.querySelector('.pc-avatar img')?.src || null;
    const escudo = card.querySelector('.pc-avatar img:last-child')?.src || null;
    return { nombre, pts, pos, club, esCapitan, foto, escudo };
  });

  const ordenPos = ['POR','DEF','MED','DEL','ENT'];
  jugadores.sort((a,b) => ordenPos.indexOf(a.pos) - ordenPos.indexOf(b.pos));

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

  // ── Header ──
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
  ctx.fillStyle = '#ffffff';
  ctx.fillText(totalPuntos, SIZE - 40, 55);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('puntos', SIZE - 40, 90);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Mi equipo · ${nombreEquipo} · Jornada ${jornada}`, 40, 88);

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
    const fotoImg   = await cargarImg(j.foto);
    const escudoImg = await cargarImg(j.escudo);

    ctx.fillStyle = j.esCapitan ? 'rgba(245,158,11,0.2)' : '#007a45';
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, CARD_H, 10);
    ctx.fill();

    if (j.esCapitan) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, CARD_H, 10);
      ctx.stroke();
    }

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

    ctx.fillStyle = j.esCapitan ? '#f59e0b' : '#ffffff';
    ctx.font = `bold ${Math.floor(CARD_H * 0.22)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(j.nombre, txtX, y + CARD_H * 0.18);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${Math.floor(CARD_H * 0.16)}px monospace`;
    ctx.fillText(`${j.pos} · ${j.club}`, txtX, y + CARD_H * 0.48);

    ctx.fillStyle = '#00d97e';
    ctx.font = `bold ${Math.floor(CARD_H * 0.2)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(j.pts + ' pts', x + cardW - 12, y + CARD_H * 0.35);

    if (j.esCapitan) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${Math.floor(CARD_H * 0.14)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('⭐ Capitán', txtX, y + CARD_H * 0.68);
    }
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
    const file = new File([blob], `${nombreEquipo}_J${jornada}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `${nombreEquipo} · J${jornada} · AsturFantasy` });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nombreEquipo}_J${jornada}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
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
