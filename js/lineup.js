/* ============================================================
   js/lineup.js  —  Alineación
   ============================================================ */

function actualizarSelectCapitan() {
  const sel = document.getElementById('capitan-select');
  if (!sel) return;
  const valorActual = sel.value;
  sel.innerHTML = '<option value="">¡Elige bien!</option>';
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
   const fechaFormateada = fecha.toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }).replace(/^\w/, c => c.toUpperCase());
    if (jornadadCerrada()) {
      deadlineEl.innerHTML = '<div class="card-label">Cierre de jornada</div><span class="deadline-cerrado">' + fechaFormateada + '</span>';
    } else {
      deadlineEl.innerHTML = '<div class="card-label">Cierre de jornada</div><span class="deadline-abierto">' + fechaFormateada + 'h</span><span class="deadline-abierto-card" style="margin-top:6px;margin-bottom:8px" id="countdown-box"><span id="countdown-timer">Calculando...</span></span>';
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
        document.getElementById('countdown-timer').textContent = 'Quedan ' + partes.join(' ') + ' para el cierre de jornada';
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

  // Calcular cambio de valor respecto a jornada anterior
  const { data: valoresAnt } = await db.from('jugadores')
    .select('nombre, club, valor')
    .eq('jornada', JORNADA_ACTIVA - 1);
  const valorAntMap = {};
  (valoresAnt || []).forEach(j => { valorAntMap[j.nombre + '|' + j.club] = parseFloat(j.valor) || 0; });
  (data || []).forEach(j => {
    const valorAnt = valorAntMap[j.nombre + '|' + j.club];
    j.cambio_valor = valorAnt !== undefined ? (parseFloat(j.valor) || 0) - valorAnt : 0;
  });

  jugadoresPorPos = { POR:[], DEF:[], MED:[], DEL:[], ENT:[] };
  (data || []).forEach(j => { if (jugadoresPorPos[j.posicion]) jugadoresPorPos[j.posicion].push(j); });
  Object.keys(jugadoresPorPos).forEach(pos => { jugadoresPorPos[pos].sort((a, b) => (b.puntos_total ?? 0) - (a.puntos_total ?? 0)); });

  if (currentUser) {
    const { data: eg } = await db.from('mi_equipo').select('jugador_id, formacion, capitan').eq('user_id', currentUser.id).eq('jornada', JORNADA_ACTIVA);

    if (eg?.length) {
      // Ya tiene equipo guardado para esta jornada — cargarlo normalmente
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

    } else {
      // No tiene equipo — intentar copiar el de la jornada anterior
      const { data: egAnterior } = await db.from('mi_equipo')
        .select('jugador_id, formacion, capitan')
        .eq('user_id', currentUser.id)
        .eq('jornada', JORNADA_ACTIVA - 1);

      let equipoGenerado = false;

      if (egAnterior?.length) {
        // Buscar los jugadores de jornada anterior por nombre+club en la jornada actual
        const idsAnt = egAnterior.map(e => e.jugador_id);
        const { data: jugadoresJ_ant } = await db.from('jugadores')
          .select('id, nombre, club, posicion, valor')
          .in('id', idsAnt);

        const jugadoresAnt = (jugadoresJ_ant || []).map(jant => {
          const enActual = data.find(j => j.nombre === jant.nombre && j.club === jant.club);
          return enActual || null;
        }).filter(Boolean);

        const todosExisten = jugadoresAnt.length === idsAnt.length;
        const costeTotal = jugadoresAnt.reduce((acc, j) => acc + (parseFloat(j.valor) || 0), 0);

        if (todosExisten && costeTotal <= PRESUPUESTO) {
          // Copiar equipo anterior
          const formacion = egAnterior[0].formacion;
          document.getElementById('formation-select').value = formacion;
          const contadores = { POR:0, DEF:0, MED:0, DEL:0, ENT:0 };
          const ordenPos = ['POR','DEF','MED','DEL','ENT'];
          jugadoresAnt.sort((a,b) => ordenPos.indexOf(a.posicion) - ordenPos.indexOf(b.posicion))
            .forEach(j => { const slotId = j.posicion + '-' + contadores[j.posicion]; seleccionados[slotId] = j; contadores[j.posicion]++; });

          // Buscar capitán por nombre+club
          const capAntReg = egAnterior.find(e => e.capitan === true || e.capitan === 1);
          let capId = null;
          if (capAntReg) {
            const jugCapAnt = (jugadoresJ_ant || []).find(j => j.id === capAntReg.jugador_id);
            if (jugCapAnt) {
              const capEnActual = data.find(j => j.nombre === jugCapAnt.nombre && j.club === jugCapAnt.club);
              capId = capEnActual?.id || null;
            }
          }
          actualizarSelectCapitan();
          if (capId) document.getElementById('capitan-select').value = capId;
          capitan = capId;

          // Guardar automáticamente en BD
          await db.from('mi_equipo').insert(
            jugadoresAnt.map(j => ({
              user_id: currentUser.id,
              jugador_id: j.id,
              jornada: JORNADA_ACTIVA,
              formacion,
              capitan: capitan === j.id
            }))
          );
          equipoGenerado = true;
          showToast('Equipo de la jornada anterior cargado automáticamente');
        }
      }

      if (!equipoGenerado) {
        await new Promise(resolve => setTimeout(resolve, 50));
        const presupuestoMin = PRESUPUESTO * 0.40;
        const presupuestoMax = PRESUPUESTO * 0.99;
        const formacion = '4-3-3';
        document.getElementById('formation-select').value = formacion;
        const necesarios = { POR:1, DEF:4, MED:3, DEL:3, ENT:1 };
        const selAuto = {};
        const usadosAuto = new Set();
        let costeAuto = 0;

        const ordenPos = ['POR','DEF','MED','DEL','ENT'];
        let exito = true;

        for (const pos of ordenPos) {
          const cantidad = necesarios[pos];

          const clubsEnSel = {};
          Object.values(selAuto).forEach(j => { clubsEnSel[j.club] = (clubsEnSel[j.club] || 0) + 1; });

          const candidatos = (jugadoresPorPos[pos] || [])
            .filter(j => !usadosAuto.has(j.id) && j.activo !== 0 && j.activo !== '0'
              && (clubsEnSel[j.club] || 0) < 2)
            .sort(() => Math.random() - 0.5);

          let selPos = [];
          let costePos = 0;
          for (const j of candidatos) {
            if (selPos.length >= cantidad) break;
            if (costeAuto + costePos + (parseFloat(j.valor) || 0) <= presupuestoMax) {
              selPos.push(j);
              costePos += parseFloat(j.valor) || 0;
            }
          }

          if (selPos.length < cantidad) { exito = false; break; }

          selPos.forEach((j, i) => {
            selAuto[pos + '-' + i] = j;
            usadosAuto.add(j.id);
            costeAuto += parseFloat(j.valor) || 0;
          });
        }

        if (exito && costeAuto >= presupuestoMin) {
          seleccionados = selAuto;
          const delanteros = Object.values(selAuto).filter(j => j.posicion === 'DEL');
          const capAuto = delanteros.sort((a,b) => (b.puntos_total||0) - (a.puntos_total||0))[0];
          capitan = capAuto?.id || null;
          actualizarSelectCapitan();
          if (capitan) document.getElementById('capitan-select').value = capitan;

          await db.from('mi_equipo').insert(
            Object.values(selAuto).map(j => ({
              user_id: currentUser.id,
              jugador_id: j.id,
              jornada: JORNADA_ACTIVA,
              formacion,
              capitan: capitan === j.id
            }))
          );
          showToast('Equipo generado automáticamente — ¡puedes modificarlo!');
        }
      }
    }
  }
  // Aviso jugadores inactivos
  const inactivosAlin = Object.values(seleccionados).filter(j => j.activo === 0 || j.activo === '0');
  const avisoEl = document.getElementById('aviso-inactivos-lineup');
  if (avisoEl) {
    if (inactivosAlin.length) {
      //avisoEl.textContent = '⚠️ ' + inactivosAlin.map(j => j.nombre).join(', ') + (inactivosAlin.length === 1 ? ' no está disponible' : ' no están disponibles');
      //avisoEl.style.display = 'block';
    } else {
      avisoEl.style.display = 'none';
    }
  }
  setTimeout(() => { renderPitch(); actualizarPresupuesto(); }, 100);
}

async function exportarAlineacion() {
  /*await new FontFace('Space Grotesk', 'url(https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-700-normal.woff2)').load()
    .then(f => document.fonts.add(f))
    .catch(() => {});*/

  const { data: equipoData } = await db
    .from('equipos')
    .select('nombre_equipo')
    .eq('user_id', currentUser.id)
    .single();
  const nombreEquipo = equipoData?.nombre_equipo || 'Mi Equipo';
  const formacion = document.getElementById('formation-select')?.value || '—';

  const ordenPos = ['POR','DEF','MED','DEL','ENT'];
  const jugadores = Object.values(seleccionados).sort((a,b) =>
    ordenPos.indexOf(a.posicion) - ordenPos.indexOf(b.posicion)
  );

  if (!jugadores.length) { showToast('No hay jugadores en la alineación', true); return; }

  const mitad = Math.ceil(jugadores.length / 2);
  const colIzq = jugadores.slice(0, mitad);
  const colDer = jugadores.slice(mitad);

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

  // Nombre equipo y jornada
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Space Grotesk"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${nombreEquipo} · Alineación J${JORNADA_ACTIVA}`, 40, 88);

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
    const esCap = String(capitan) === String(j.id);

    // Card
    ctx.fillStyle = esCap ? 'rgba(245,158,11,0.2)' : '#007a45';
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, CARD_H, 10);
    ctx.fill();

    if (esCap) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, CARD_H, 10);
      ctx.stroke();
    }

    // Foto circular
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

    // Escudo pequeño
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

    // Texto
    const txtX = x + 14 + r * 2 + 12;

    ctx.fillStyle = esCap ? '#f59e0b' : '#ffffff';
    ctx.font = `bold ${Math.floor(CARD_H * 0.22)}px "Space Grotesk"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(j.nombre, txtX, y + CARD_H * 0.18);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${Math.floor(CARD_H * 0.16)}px monospace`;
    //ctx.fillText(j.posicion + ' · ' + j.club, txtX, y + CARD_H * 0.48);
    ctx.fillText(j.posicion + ' · ' + (j.valor || '—') + 'M', txtX, y + CARD_H * 0.48);

    if (esCap) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${Math.floor(CARD_H * 0.14)}px "Space Grotesk"`;
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
    const file = new File([blob], `alineacion-j${JORNADA_ACTIVA}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `Alineación J${JORNADA_ACTIVA} · AsturFantasy` });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alineacion-j${JORNADA_ACTIVA}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
}

function renderPitch() {
  const formacion = document.getElementById('formation-select').value;
  const { def, mid, fwd } = FORMACIONES[formacion];
  const pitch = document.getElementById('pitch');
  pitch.querySelectorAll('.pitch-row').forEach(r => r.remove());
  const stripes = document.getElementById('pitch-stripes');
  stripes.innerHTML = '';
  for (let i = 0; i < 10; i++) { const d = document.createElement('div'); d.className = 'pitch-stripe'; stripes.appendChild(d); }
  const filas = [{ pos:'DEL', count:fwd, cls:'fwd' }, { pos:'MED', count:mid, cls:'mid' }, { pos:'DEF', count:def, cls:'def' }, { pos:'POR', count:1, cls:'gk' }];
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
  renderCoachCard();
}

function renderCoachCard() {
  const jugador = seleccionados['ENT-0'];
  const avatar = document.getElementById('coach-avatar');
  const nombre = document.getElementById('coach-name');
  const club = document.getElementById('coach-club');
  const card = document.getElementById('coach-card');
  if (!card) return;

  if (jugador) {
    nombre.textContent = jugador.nombre;
    club.textContent = jugador.club || '—';
    if (jugador.foto_url) {
      avatar.src = jugador.foto_url;
      avatar.style.display = '';
      avatar.onerror = () => { avatar.style.display = 'none'; };
    } else {
      avatar.style.display = 'none';
    }
  } else {
    nombre.textContent = 'Elige entrenador';
    club.textContent = '—';
    avatar.style.display = 'none';
  }
  card.onclick = () => openModal('ENT-0', 'ENT', 'ent');
}

function openModal(slotId, posicion, cls) {
  const labels = { POR:'Portero', DEF:'Defensa', MED:'Mediocampista', DEL:'Delantero', ENT:'Entrenador' };
  document.getElementById('modal-title').textContent = 'Seleccionar ' + labels[posicion];
  const usados = new Set(Object.values(seleccionados).map(j => j.id));
  const clubsCount = {};
  Object.values(seleccionados).forEach(j => { clubsCount[j.club] = (clubsCount[j.club] || 0) + 1; });
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
      const clubLleno = !usado && (clubsCount[j.club] || 0) >= 2;
      const noD = j.activo === 0 || j.activo === '0';
      const bR = noD ? '3px solid rgba(220,38,38,0.9)' : '1px solid var(--border)';
      const esc = '<div style="position:relative;width:36px;height:36px;flex-shrink:0">' + (j.foto_url ? '<img loading="lazy" src="' + j.foto_url + '" width="36" height="36" style="object-fit:cover;border-radius:50%;border:' + bR + '" onerror="this.style.display=\'none\'">' : '<div style="width:36px;height:36px;border-radius:50%;background:' + colores[cls] + ';color:' + textoCols[cls] + ';display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:12px;border:' + bR + '">' + j.nombre.substring(0,2).toUpperCase() + '</div>') + (j.escudo_url ? '<img loading="lazy" src="' + j.escudo_url + '" width="13" height="13" style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;border-radius:50%;background:white;border:1px solid rgba(0,0,0,0.2)">' : '') + '</div>';
      return '<div class="modal-player" data-id="' + j.id + '" data-slot="' + slotId + '" style="opacity:' + (usado || clubLleno ? '0.3' : '1') + ';pointer-events:' + (usado || clubLleno ? 'none' : 'auto') + '">' + esc + '<div><div class="modal-player-name">' + j.nombre + '</div><div class="modal-player-meta">' + j.club + ' · ' + j.posicion + (j.rival ? ' · vs ' + j.rival + ' (' + (j.es_local ? '🏠' : '✈️') + ')' : '') + '</div></div><div style="text-align:right"><div class="modal-player-pts">' + (j.puntos_total || 0) + '</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--amber)">' + (j.valor || 0) + 'M' + (j.cambio_valor > 0 ? ' <span style="color:#4cd97b;font-size:9px">▲</span>' : j.cambio_valor < 0 ? ' <span style="color:#f05e5e;font-size:9px">▼</span>' : '') + '</div></div></div>';
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

  // Comprobar máximo 2 jugadores por club
  const clubCount = {};
  Object.values(seleccionados).forEach(j => { clubCount[j.club] = (clubCount[j.club] || 0) + 1; });
  const clubExcedido = Object.entries(clubCount).find(([club, count]) => count > 2);
  if (clubExcedido) { showToast('Máximo 2 jugadores del mismo club (' + clubExcedido[0] + ')', true); return; }

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

async function limpiarAlineacion() {
  if (!currentUser || !confirm('¿Seguro que quieres vaciar tu alineación?')) return;
  await db.from('mi_equipo').delete().eq('user_id', currentUser.id).eq('jornada', JORNADA_ACTIVA);
  seleccionados = {}; capitan = null;
  const sel = document.getElementById('capitan-select');
  if (sel) sel.innerHTML = '<option value="">— Elige tu capitán —</option>';
  renderPitch();
  showToast('Alineación vaciada');
}

document.getElementById('btn-export-png')?.addEventListener('click', exportarAlineacion);
