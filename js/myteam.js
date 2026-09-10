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
    const { data: jugData } = await db.from('jugadores').select('id, escudo_url, foto_url, valor, activo, gol, asistencia, amarilla, doble_amarilla, roja').in('id', ids);
    const escudoMap = {}, fotoMap = {}, valorMap = {}, activoMap = {}, golMap = {}, asistMap = {}, amarillaMap = {}, dobleAmarillaMap = {}, rojaMap = {};
    (jugData || []).forEach(j => { escudoMap[j.id] = j.escudo_url; fotoMap[j.id] = j.foto_url; valorMap[j.id] = j.valor; activoMap[j.id] = j.activo; golMap[j.id] = j.gol || 0; asistMap[j.id] = j.asistencia || 0; amarillaMap[j.id] = j.amarilla || 0; dobleAmarillaMap[j.id] = j.doble_amarilla || 0; rojaMap[j.id] = j.roja || 0; });
    const { data: capData } = await db.from('mi_equipo').select('jugador_id').eq('user_id', currentUser.id).eq('jornada', jornada).eq('capitan', true).single();
    const capitanId = capData?.jugador_id || null;
    const orden = ['POR','DEF','MED','DEL','ENT'];
    const sorted = [...data].sort((a,b) => orden.indexOf(a.posicion) - orden.indexOf(b.posicion));
    const totalPuntos = sorted.reduce((acc, j) => { const pts = j.puntos || 0; return acc + (j.jugador_id === capitanId ? pts * 2 : pts); }, 0);
      const totalGoles = sorted.reduce((acc, j) => acc + (golMap[j.jugador_id] || 0), 0);
      const totalAsistencias = sorted.reduce((acc, j) => acc + (asistMap[j.jugador_id] || 0), 0);
      const totalAmonestaciones = sorted.reduce((acc, j) => acc + (amarillaMap[j.jugador_id] || 0) + (dobleAmarillaMap[j.jugador_id] || 0) + (rojaMap[j.jugador_id] || 0), 0);
    const formacion = data[0]?.formacion || '—';
    const { data: mediaData } = await db.from('clasificacion_automatica').select('puntos').eq('jornada', jornada);
    const media = mediaData?.length ? Math.round(mediaData.reduce((acc, r) => acc + r.puntos, 0) / mediaData.length) : 0;

    banner.style.display = 'block';
    banner.innerHTML =
      '<div class="saved-sub" style="text-align:center">Formación <strong>' + formacion + '</strong> · Jornada ' + jornada + '</div>' +
      '<div class="saved-sub" style="text-align:center;margin-top:6px"><strong>' + totalGoles + '</strong> goles · <strong>' + totalAsistencias + '</strong> asistencias · <strong>' + totalAmonestaciones + '</strong> amonestaciones</div>' +
      '<div class="saved-pts-high" style="text-align:center"><strong>' + totalPuntos + ' PUNTOS</strong></div>' +
      '<div class="saved-sub" style="text-align:center;margin-top:6px">Media de la jornada: <strong>' + media + ' pts</strong></div>' +
      '<button onclick="compartirEquipo()" style="width:100%;margin-top:12px;padding:10px;background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:10px;font-family:var(--font-display);font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px"><i class="ti ti-share"></i> Compartir mi equipo</button>';

  grid.innerHTML = sorted.map(j => {
    const foto = fotoMap[j.jugador_id];
    const escudo = escudoMap[j.jugador_id];
    const esC = j.jugador_id === capitanId;
    const pts = esC ? j.puntos * 2 : j.puntos;
    const estadoVal = Number(activoMap[j.jugador_id]);
    const sancionado = estadoVal === 0;
    const duda = estadoVal === 2;
    const lesionado = estadoVal === 3;
    const avatar = foto ? '<img loading="lazy" src="' + foto + '" width="40" height="40" style="object-fit:cover;border-radius:50%" onerror="this.style.display=\'none\'">' : j.nombre.substring(0,2).toUpperCase();
    return '<div class="player-card ' + (esC ? 'card-capitan' : '') + '" style="cursor:pointer' + (sancionado ? ';border:1px solid rgba(240,94,94,0.5);' : duda ? ';border:1px solid rgba(255,140,0,0.6);' : lesionado ? ';border:1px solid rgba(240,94,94,0.5);' : '') + '" onclick="mostrarDesgloseMyTeam(\'' + j.jugador_id + '\',\'' + j.nombre + '\',\'' + j.posicion + '\',' + jornada + ')">' +
      '<div class="pc-avatar" style="position:relative;background:' + POS_COLORS[j.posicion] + ';color:' + POS_TEXT[j.posicion] + ';overflow:visible">' +
        avatar +
                        (sancionado ? '<div style="position:absolute;inset:0;border-radius:50%;background:rgba(240,94,94,0.4);display:flex;align-items:center;justify-content:center;font-size:14px">🟥</div>'
                          : duda ? '<div style="position:absolute;inset:0;border-radius:50%;background:rgba(255,140,0,0.4);display:flex;align-items:center;justify-content:center;font-size:14px">❓️</div>'
                          : lesionado ? '<div style="position:absolute;inset:0;border-radius:50%;background:rgba(240,94,94,0.4);display:flex;align-items:center;justify-content:center;font-size:14px">🚑</div>' : '') +
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
            const esc = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const argsPartido = `'${esc(p.local_abrev)}','${esc(p.visitante_abrev)}','${esc(p.local_nombre)}','${esc(p.visitante_nombre)}',${p.jornada}`;
            return `
              <div style="background:var(--surface);border-radius:10px;padding:10px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer"
                   onclick="mostrarPartido(${argsPartido})">
                <div style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:4px">
                  ${localImg}
                  <div style="flex:1;font-family:var(--font-display);font-size:10px;font-weight:600;color:var(--text);text-align:center;line-height:1.2">${p.local_abrev}</div>
                  <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:${p.finalizado ? 'var(--neon)' : 'var(--text-muted)'};white-space:nowrap">
                    ${p.finalizado ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                      <span>${p.resultado_local}-${p.resultado_visitante}</span>
                      <button onclick="event.stopPropagation();mostrarPartido(${argsPartido})"
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
  const totalPuntos = ptsMatch ? parseInt(ptsMatch[1]) : 0;

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

  const FILAS = [
    { pos: 'DEL', color: '#f05e5e', textColor: '#ffffff' },
    { pos: 'MED', color: '#4cd97b', textColor: '#111816' },
    { pos: 'DEF', color: '#5b9cf6', textColor: '#ffffff' },
    { pos: 'POR', color: '#e3b341', textColor: '#111816' },
  ];
  const porFila = { DEL: [], MED: [], DEF: [], POR: [], ENT: [] };
  jugadores.forEach(j => { if (porFila[j.pos]) porFila[j.pos].push(j); });
  const entrenador = porFila.ENT[0] || null;

  const cargarImg = (url) => new Promise(res => {
    if (!url) { res(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = url;
  });

  const SIZE = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#111816';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const HEADER_H = 150;
  ctx.font = 'bold 36px "Space Grotesk", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('ASTUR', 40, 46);
  ctx.fillStyle = '#4cd97b';
  ctx.fillText('FANTASY', 40 + ctx.measureText('ASTUR').width, 46);

  ctx.fillStyle = '#f0f4f2';
  ctx.font = 'bold 22px "Space Grotesk", sans-serif';
  ctx.fillText(nombreEquipo, 40, 84);

  ctx.fillStyle = '#7a9088';
  ctx.font = '13px monospace';
  ctx.fillText('Jornada ' + jornada, 40, 112);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#f0f4f2';
  ctx.font = 'bold 18px "Space Grotesk", sans-serif';
  ctx.fillText('Resultado J' + jornada, SIZE - 40, 38);
  ctx.fillStyle = '#4cd97b';
  ctx.font = 'bold 22px "Space Grotesk", sans-serif';
  ctx.fillText(totalPuntos + ' PUNTOS', SIZE - 40, 64);

  const gradH = ctx.createLinearGradient(0, 0, SIZE, 0);
  gradH.addColorStop(0, 'transparent');
  gradH.addColorStop(0.5, 'rgba(76,217,123,0.5)');
  gradH.addColorStop(1, 'transparent');
  ctx.strokeStyle = gradH;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HEADER_H);
  ctx.lineTo(SIZE, HEADER_H);
  ctx.stroke();

  const PITCH_X = 24;
  const PITCH_Y = HEADER_H + 14;
  const PITCH_W = SIZE - PITCH_X * 2;
  const FOOTER_H = 44;
  const ENT_LINE_H = entrenador ? 34 : 0;
  const PITCH_H = SIZE - PITCH_Y - FOOTER_H - ENT_LINE_H - 14;

  const gradPitch = ctx.createLinearGradient(0, PITCH_Y, 0, PITCH_Y + PITCH_H);
  gradPitch.addColorStop(0, '#1a3a26');
  gradPitch.addColorStop(0.5, '#1e4a2e');
  gradPitch.addColorStop(1, '#1a3a26');
  ctx.fillStyle = gradPitch;
  ctx.beginPath();
  ctx.roundRect(PITCH_X, PITCH_Y, PITCH_W, PITCH_H, 16);
  ctx.fill();
  ctx.save();
  ctx.clip();

  const NUM_STRIPES = 10;
  const STRIPE_H = PITCH_H / NUM_STRIPES;
  for (let i = 0; i < NUM_STRIPES; i += 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fillRect(PITCH_X, PITCH_Y + i * STRIPE_H, PITCH_W, STRIPE_H);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PITCH_X + 16, PITCH_Y + PITCH_H / 2);
  ctx.lineTo(PITCH_X + PITCH_W - 16, PITCH_Y + PITCH_H / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(PITCH_X + PITCH_W / 2, PITCH_Y + PITCH_H / 2, 55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const ROW_MARGIN = 24;
  const filasConJugadores = FILAS.filter(f => porFila[f.pos].length > 0);
  const AVAILABLE_ROWS_H = PITCH_H - ROW_MARGIN * 2;
  const ROW_H = filasConJugadores.length ? AVAILABLE_ROWS_H / filasConJugadores.length : 0;
  const CIRCLE_R = Math.min(50, Math.floor(ROW_H * 0.32));

  const dibujarJugador = async (jugador, cx, cy, color, textColor) => {
    const esCap = jugador.esCapitan;
    const fotoImg = await cargarImg(jugador.foto);
    const escudoImg = await cargarImg(jugador.escudo);

    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_R, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = esCap ? 4 : 2;
    ctx.strokeStyle = esCap ? '#e3b341' : 'rgba(255,255,255,0.2)';
    ctx.stroke();
    if (esCap) {
      ctx.save();
      ctx.shadowColor = 'rgba(227,179,65,0.6)';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(cx, cy, CIRCLE_R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (fotoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, CIRCLE_R - 3, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(fotoImg, cx - (CIRCLE_R - 3), cy - (CIRCLE_R - 3), (CIRCLE_R - 3) * 2, (CIRCLE_R - 3) * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = textColor;
      ctx.font = `bold ${Math.floor(CIRCLE_R * 0.6)}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(jugador.nombre.substring(0, 3).toUpperCase(), cx, cy);
    }

    if (escudoImg) {
      const er = 13;
      const ex = cx + CIRCLE_R - er + 2;
      const ey = cy + CIRCLE_R - er + 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.clip();
      ctx.drawImage(escudoImg, ex - er, ey - er, er * 2, er * 2);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (esCap) {
      const bx = cx + CIRCLE_R - 5;
      const by = cy - CIRCLE_R + 5;
      ctx.beginPath();
      ctx.arc(bx, by, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#e3b341';
      ctx.fill();
      ctx.fillStyle = '#111816';
      ctx.font = 'bold 13px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C', bx, by + 1);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(CIRCLE_R * 0.34)}px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText(jugador.nombre, cx, cy + CIRCLE_R + 6);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#4cd97b';
    ctx.font = `bold ${Math.floor(CIRCLE_R * 0.3)}px "Space Grotesk", sans-serif`;
    ctx.fillText(jugador.pts + ' pts', cx, cy + CIRCLE_R + 6 + Math.floor(CIRCLE_R * 0.42));
  };

  let currentY = PITCH_Y + ROW_MARGIN;
  for (const fila of filasConJugadores) {
    const jugadoresFila = porFila[fila.pos];
    const rowY = currentY + ROW_H / 2 - 8;
    const gap = PITCH_W / (jugadoresFila.length + 1);
    for (let i = 0; i < jugadoresFila.length; i++) {
      const cx = PITCH_X + gap * (i + 1);
      await dibujarJugador(jugadoresFila[i], cx, rowY, fila.color, fila.textColor);
    }
    currentY += ROW_H;
  }

  if (entrenador) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px "Space Grotesk", sans-serif';
    const etiqueta = 'Entrenador: ';
    const nombreEnt = entrenador.nombre + ' (' + (entrenador.club || '—') + ') · ' + entrenador.pts + ' pts';
    const anchoEtiqueta = ctx.measureText(etiqueta).width;
    const anchoNombre = ctx.measureText(nombreEnt).width;
    const startX = SIZE / 2 - (anchoEtiqueta + anchoNombre) / 2;
    const entY = PITCH_Y + PITCH_H + ENT_LINE_H / 2 + 6;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(etiqueta, startX, entY);
    ctx.fillStyle = '#f0f4f2';
    ctx.fillText(nombreEnt, startX + anchoEtiqueta, entY);
  }

  const footerY = SIZE - FOOTER_H / 2 - 8;
  const gradF = ctx.createLinearGradient(0, 0, SIZE, 0);
  gradF.addColorStop(0, 'transparent');
  gradF.addColorStop(0.5, 'rgba(76,217,123,0.4)');
  gradF.addColorStop(1, 'transparent');
  ctx.strokeStyle = gradF;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, footerY - 12);
  ctx.lineTo(SIZE, footerY - 12);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('asturfantasy.com', SIZE / 2, footerY + 10);

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
