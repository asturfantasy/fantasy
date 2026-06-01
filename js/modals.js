/* ============================================================
   js/modals.js  —  Modales, notificaciones y equipo favorito
   ============================================================ */

/* ── NOTIFICACIONES ─────────────────────────────────────── */
async function toggleNotificaciones() {
  const { data: existente } = await db.from('push_subscriptions').select('id').eq('user_id', currentUser.id).limit(1);
  if (existente?.length) {
    await db.from('push_subscriptions').delete().eq('user_id', currentUser.id);
    actualizarToggleNotif(false);
    showToast('Notificaciones desactivadas');
  } else {
    await registrarNotificaciones();
  }
}

function actualizarToggleNotif(activo) {
  notificacionesActivas = activo;
  document.querySelectorAll('[id^="toggle-notif"]').forEach(toggle => {
    toggle.style.background = activo ? '#00d97e' : '#888';
    const knob = toggle.querySelector('div');
    if (knob) knob.style.left = activo ? '18px' : '2px';
  });
}

async function registrarNotificaciones() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return;
  const { data: existente } = await db.from('push_subscriptions').select('id').eq('user_id', currentUser.id).limit(1);
  if (existente?.length) return;
  const registro = await navigator.serviceWorker.ready;
  const subscription = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: 'BO8jjePXwsFyfbvbYDG4ybLum0RpYkieXNXadNgIvn55YXtV8AHi1rdtSet4uhn7s6goILwqX2L_q7W24iozc5k'
  });
  await db.from('push_subscriptions').insert({ user_id: currentUser.id, subscription: JSON.stringify(subscription) });
  actualizarToggleNotif(true);
}

/* ── EQUIPO FAVORITO ────────────────────────────────────── */
function seleccionarEquipoFavorito(club) {
  equipoFavoritoSeleccionado = club;
  document.querySelectorAll('.equipo-favorito-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.club === club);
  });
  const btn = document.getElementById('btn-guardar-equipo-favorito');
  if (btn) { btn.disabled = false; btn.style.background = 'var(--neon)'; btn.style.color = '#0d1117'; btn.style.cursor = 'pointer'; }
}

document.getElementById('btn-guardar-equipo-favorito')?.addEventListener('click', async () => {
  if (!equipoFavoritoSeleccionado || !currentUser) return;
  const btn = document.getElementById('btn-guardar-equipo-favorito');
  btn.disabled = true; btn.textContent = 'Guardando...';
  await db.from('equipos').update({ equipo_favorito: equipoFavoritoSeleccionado }).eq('user_id', currentUser.id);
  document.getElementById('modal-equipo-favorito').classList.remove('open');
  goTo('home');
});

document.getElementById('btn-guardar-nombre-inicio')?.addEventListener('click', async () => {
  const nombre = document.getElementById('input-nombre-equipo-inicio').value.trim();
  if (!nombre) { showToast('Introduce un nombre', true); return; }
  await db.from('equipos').upsert({ user_id: currentUser.id, nombre_equipo: nombre }, { onConflict: 'user_id' });
  document.getElementById('modal-nombre-equipo').classList.remove('open');
  document.getElementById('modal-equipo-favorito').classList.add('open');
});

/* ── CONSULTA PUNTOS ────────────────────────────────────── */
async function abrirConsultaPuntos() {
  const modal = document.getElementById('modal-puntos-jornada');
  const content = document.getElementById('puntos-jornada-content');
  document.getElementById('puntos-jornada-titulo').textContent = 'Consulta de puntos';
  content.innerHTML = '';
  modal.classList.add('open');

  const selectEquipo = document.getElementById('puntos-equipo-select');
  if (selectEquipo) selectEquipo.style.display = 'none';

  const { data: jornadasData } = await db.from('partidos')
    .select('jornada').lt('jornada', JORNADA_ACTIVA).order('jornada', { ascending: false });
  const jornadas = [...new Set((jornadasData || []).map(p => p.jornada))];

  if (!jornadas.length) {
    content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">No hay jornadas anteriores disponibles</div>';
    return;
  }

  let jornadaSelect = document.getElementById('puntos-jornada-select');
  if (!jornadaSelect) {
    jornadaSelect = document.createElement('select');
    jornadaSelect.id = 'puntos-jornada-select';
    jornadaSelect.className = 'formation-select';
    jornadaSelect.style.cssText = 'width:100%;margin-bottom:14px';
    content.parentNode.insertBefore(jornadaSelect, content);
  }
  jornadaSelect.style.display = 'block';
  jornadaSelect.innerHTML = jornadas.map(j => '<option value="' + j + '">Jornada ' + j + '</option>').join('');
  jornadaSelect.value = jornadas[0];

  const cargarPartidos = async () => {
    const jornada = parseInt(jornadaSelect.value);
    content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Cargando...</div>';
    const { data: partidos } = await db.from('partidos').select('*').eq('jornada', jornada).order('fecha');
    if (!partidos?.length) { content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin partidos para esta jornada</div>'; return; }
    content.innerHTML = partidos.map(p => `
      <div class="match-card" style="cursor:pointer;margin-bottom:8px" onclick="mostrarPartido('${p.local_abrev}','${p.visitante_abrev}','${p.local_nombre}','${p.visitante_nombre}',${jornada},true)">
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;text-align:center">
          <div class="crest" style="display:flex;align-items:center;justify-content:center">
            ${p.local_escudo_url ? '<img loading="lazy" src="' + p.local_escudo_url + '" width="44" height="44" style="object-fit:contain">' : p.local_abrev}
          </div>
          <div class="team-name" style="font-size:11px;line-height:1.2">${p.local_nombre}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;padding:0 8px;flex-shrink:0">
          ${p.finalizado
            ? '<div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--text);letter-spacing:2px">' + p.resultado_local + ' - ' + p.resultado_visitante + '</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--neon);text-transform:uppercase">Final</div>'
            : '<div class="match-vs">' + (p.estadio || '') + '</div><div class="match-date">' + (p.fecha || '') + '</div>'}
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;text-align:center">
          <div class="crest" style="display:flex;align-items:center;justify-content:center">
            ${p.visitante_escudo_url ? '<img loading="lazy" src="' + p.visitante_escudo_url + '" width="44" height="44" style="object-fit:contain">' : p.visitante_abrev}
          </div>
          <div class="team-name" style="font-size:11px;line-height:1.2">${p.visitante_nombre}</div>
        </div>
      </div>`).join('');
  };

  await cargarPartidos();
  jornadaSelect.onchange = cargarPartidos;
}

document.getElementById('puntos-jornada-close')?.addEventListener('click', () => {
  document.getElementById('modal-puntos-jornada').classList.remove('open');
  const jornadaSelect = document.getElementById('puntos-jornada-select');
  if (jornadaSelect) jornadaSelect.style.display = 'none';
  const selectEquipo = document.getElementById('puntos-equipo-select');
  if (selectEquipo) selectEquipo.style.display = 'block';
});
document.getElementById('modal-puntos-jornada')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

// Contacto
document.querySelectorAll('.contacto-motivo').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.contacto-motivo').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

function abrirContacto() {
  ['user-menu','user-menu-lineup','user-menu-myteam','user-menu-ranking','user-menu-criterios'].forEach(id => {
    const m = document.getElementById(id); if (m) m.style.display = 'none';
  });
  document.getElementById('modal-contacto').classList.add('open');
}

document.getElementById('contacto-close')?.addEventListener('click', () => document.getElementById('modal-contacto').classList.remove('open'));
document.getElementById('modal-contacto')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

document.getElementById('btn-contacto-enviar')?.addEventListener('click', () => {
  const motivo = document.querySelector('.contacto-motivo.active')?.dataset.motivo || 'Consulta';
  const mensaje = document.getElementById('contacto-mensaje').value.trim();
  if (!mensaje) { showToast('Escribe tu mensaje', true); return; }
  const asunto = encodeURIComponent('AsturFantasy · ' + motivo);
  const cuerpo = encodeURIComponent(mensaje + '\n\n— ' + (currentUser?.email || 'Usuario'));
  window.open('mailto:asturfantasycontacto@gmail.com?subject=' + asunto + '&body=' + cuerpo);
  document.getElementById('modal-contacto').classList.remove('open');
  document.getElementById('contacto-mensaje').value = '';
});

/* ── DESGLOSE ───────────────────────────────────────────── */
function desgloseFn(j) {
  const items = [];
  if (j.posicion === 'ENT') { items.push({ label: 'Puntos entrenador', pts: j.puntos_entrenador || 0 }); return items; }
  const pcPts = j.posicion === 'POR' || j.posicion === 'DEF' ? 4 : j.posicion === 'MED' ? 2 : 0;
  const golPts = j.posicion === 'POR' ? 6 : j.posicion === 'DEF' ? 5 : j.posicion === 'MED' ? 4 : 3;
  const lnePts = j.lne === 1 ? 1 : j.lne === 2 ? 2 : j.lne === 3 ? 4 : 0;
  items.push({ label: 'Minutos (' + (j.minutos || 0) + ')', pts: (j.minutos || 0) >= 60 ? 2 : (j.minutos || 0) > 0 ? 1 : 0 });
  if (pcPts > 0) items.push({ label: 'Portería a cero', pts: (j.puerta_cero && (j.minutos || 0) >= 60) ? pcPts : 0 });
  items.push({ label: 'Nota LNE (' + (j.lne || 0) + ')', pts: lnePts });
  items.push({ label: 'Goles (' + (j.gol || 0) + ')', pts: (j.gol || 0) * golPts });
  items.push({ label: 'Gol de penalti (' + (j.penalti_marcado || 0) + ')', pts: (j.penalti_marcado || 0) * 3 });
  if (j.posicion === 'POR') {
    items.push({ label: 'Penalti parado (' + (j.penalti_fallado || 0) + ')', pts: (j.penalti_fallado || 0) * 3 });
  } else {
    items.push({ label: 'Penalti fallado (' + (j.penalti_fallado || 0) + ')', pts: (j.penalti_fallado || 0) * -3 });
  }
  items.push({ label: 'Asistencias (' + (j.asistencia || 0) + ')', pts: (j.asistencia || 0) * 3 });
  items.push({ label: 'Gol PP (' + (j.gol_pp || 0) + ')', pts: (j.gol_pp || 0) * -2 });
  items.push({ label: 'Amarillas (' + (j.amarilla || 0) + ')', pts: (j.amarilla || 0) * -1 });
  items.push({ label: 'Doble amarilla (' + (j.doble_amarilla || 0) + ')', pts: (j.doble_amarilla || 0) * -3 });
  items.push({ label: 'Roja directa (' + (j.roja || 0) + ')', pts: (j.roja || 0) * -5 });
  if (['POR', 'DEF', 'MED'].includes(j.posicion)) items.push({ label: 'Goles encajados (' + (j.goles_encajados || 0) + ')', pts: (j.posicion === 'POR' || j.posicion === 'DEF') ? -Math.floor((j.goles_encajados || 0) / 2) : 0 });
  return items;
}

function mostrarDesglose(j) {
  const modal = document.getElementById('modal-desglose');
  const content = document.getElementById('desglose-content');
  document.getElementById('desglose-titulo').textContent = j.nombre;
  const items = desgloseFn(j);
  content.innerHTML = items.length
    ? items.map(item => '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-family:var(--font-body);font-size:13px;color:var(--text-muted)">' + item.label + '</span><span style="font-family:var(--font-display);font-weight:700;font-size:15px;color:' + (item.pts >= 0 ? 'var(--neon)' : 'var(--red)') + '">' + (item.pts > 0 ? '+' : '') + item.pts + '</span></div>').join('') +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;margin-top:4px"><span style="font-family:var(--font-display);font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:var(--text)">Total</span><span style="font-family:var(--font-display);font-weight:700;font-size:24px;color:var(--neon)">' + j.total_jornada + '</span></div>'
    : '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin puntuación esta jornada</div>';
  modal.classList.add('open');
}

document.getElementById('desglose-close')?.addEventListener('click', () => document.getElementById('modal-desglose').classList.remove('open'));
document.getElementById('modal-desglose')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

/* ── HISTORIAL ──────────────────────────────────────────── */
async function mostrarHistorial(nombre, club, posicion) {
  const modal = document.getElementById('modal-historial');
  const content = document.getElementById('historial-content');
  document.getElementById('historial-titulo').textContent = nombre;
  content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Cargando...</div>';
  modal.classList.add('open');

  const [{ data: partidosPublicados }, { data: todosPartidos }] = await Promise.all([
    db.from('partidos').select('jornada').eq('publicado', true).or(`local_abrev.eq.${club},visitante_abrev.eq.${club}`),
    db.from('partidos').select('jornada, resultado_local, resultado_visitante, finalizado').eq('finalizado', true).or(`local_abrev.eq.${club},visitante_abrev.eq.${club}`)
  ]);

  const jornadasPublicadas = (partidosPublicados || []).map(p => p.jornada);

  if (!jornadasPublicadas.length) {
    content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin datos</div>';
    return;
  }

  const marcadores = {};
  (todosPartidos || []).forEach(p => {
    marcadores[p.jornada] = { local: p.resultado_local, visitante: p.resultado_visitante };
  });

  const { data, error } = await db.from('jugadores')
    .select('jornada, total_jornada, escudo_url, foto_url, rival, es_local, gol, penalti_marcado, penalti_fallado, gol_pp, asistencia, amarilla, doble_amarilla, roja, puerta_cero, minutos, rol, goles_encajados, puntos_entrenador')
    .eq('nombre', nombre).eq('club', club)
    .in('jornada', jornadasPublicadas)
    .order('jornada', { ascending: true });

  if (error || !data?.length) {
    content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin datos</div>';
    return;
  }

  const maxPts = Math.max(...data.map(d => d.total_jornada), 1);
  const total  = data.reduce((acc, d) => acc + d.total_jornada, 0);
  const foto   = data[0]?.foto_url || '';
  const escudo = data[0]?.escudo_url || '';

  const getMarcador = (d) => {
    const m = marcadores[d.jornada];
    if (!m) return '';
    return m.local + '-' + m.visitante;
  };

  const iconos = (d) => {
    if (posicion === 'ENT') return '';
    const items = [];
    if (d.puerta_cero) items.push('<i class="ti ti-lock" title="Portería a cero" style="font-size:15px;color:var(--green-light)"></i>');
    if (d.gol > 0) for (let i = 0; i < d.gol; i++) items.push('<i class="ti ti-ball-football" title="Gol" style="font-size:15px;color:white"></i>');
    if (d.penalti_marcado > 0) {
      for (let i = 0; i < d.penalti_marcado; i++)
        items.push('<i class="ti ti-target" title="Gol de penalti" style="font-size:15px;color:var(--green-light)"></i>');
    }
    if (d.penalti_fallado > 0) {
      for (let i = 0; i < d.penalti_fallado; i++)
        items.push(posicion === 'POR'
          ? '<i class="ti ti-hand-stop" title="Penalti parado" style="font-size:15px;color:var(--green-light)"></i>'
          : '<i class="ti ti-x" title="Penalti fallado" style="font-size:15px;color:var(--red)"></i>');
    }
    if (d.gol_pp > 0) for (let i = 0; i < d.gol_pp; i++) items.push('<i class="ti ti-ball-football" title="Gol en propia puerta" style="font-size:15px;color:var(--red)"></i>');
    if (d.asistencia > 0) for (let i = 0; i < d.asistencia; i++) items.push('<i class="ti ti-shoe" title="Asistencia" style="font-size:15px;color:white"></i>');
    if (d.doble_amarilla) items.push('<i class="ti ti-cards" title="Doble amarilla" style="font-size:15px;color:var(--yellow)"></i>');
    else if (d.amarilla) items.push('<i class="ti ti-rectangle-filled" title="Amarilla" style="font-size:15px;color:var(--yellow)"></i>');
    if (d.roja) items.push('<i class="ti ti-rectangle-filled" title="Roja directa" style="font-size:15px;color:var(--red)"></i>');
    const expulsado = d.doble_amarilla || d.roja;
    if (d.rol === 'titular' && d.minutos < 90 && d.minutos > 0 && !expulsado)
      items.push('<i class="ti ti-arrows-exchange" title="Sustituido (' + d.minutos + ' min)" style="font-size:15px;color:var(--text-muted)"></i>');
    return items.length ? '<div style="display:flex;gap:3px;align-items:center;flex-shrink:0">' + items.join('') + '</div>' : '';
  };

  const cardStyle = (hasValue) => 'background:var(--bg);border-radius:8px;padding:8px;text-align:center;' + (!hasValue ? 'opacity:0.3;' : '');

  let statsCards = '';

  if (posicion === 'ENT') {
    const victorias = data.filter(d => d.puntos_entrenador === 3).length;
    const empates   = data.filter(d => d.puntos_entrenador === 1).length;
    const derrotas  = data.filter(d => d.puntos_entrenador === 0 && d.total_jornada !== null).length;
    statsCards = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px">
        <div style="${cardStyle(victorias > 0)}">
          <i class="ti ti-trophy" style="font-size:16px;color:#4cd97b"></i>
          <div style="font-size:16px;font-weight:800;color:#4cd97b;margin-top:2px">${victorias}</div>
          <div style="font-size:8px;color:#7a9088;letter-spacing:1px">VICTORIAS</div>
        </div>
        <div style="${cardStyle(empates > 0)}">
          <i class="ti ti-minus" style="font-size:16px;color:#7a9088"></i>
          <div style="font-size:16px;font-weight:800;color:#7a9088;margin-top:2px">${empates}</div>
          <div style="font-size:8px;color:#7a9088;letter-spacing:1px">EMPATES</div>
        </div>
        <div style="${cardStyle(derrotas > 0)}">
          <i class="ti ti-x" style="font-size:16px;color:#f05e5e"></i>
          <div style="font-size:16px;font-weight:800;color:#f05e5e;margin-top:2px">${derrotas}</div>
          <div style="font-size:8px;color:#7a9088;letter-spacing:1px">DERROTAS</div>
        </div>
      </div>`;
  } else if (posicion === 'POR') {
    const golesEnc    = data.reduce((a,d) => a + (d.goles_encajados||0), 0);
    const portCero    = data.filter(d => (d.goles_encajados||0) === 0 && (d.minutos||0) >= 60).length;
    const penParados  = data.reduce((a,d) => a + (d.penalti_fallado||0), 0);
    const amarillas   = data.reduce((a,d) => a + (d.amarilla||0), 0);
    const rojas       = data.reduce((a,d) => a + (d.roja||0) + (d.doble_amarilla||0), 0);
    statsCards = `
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:14px">
        <div style="${cardStyle(golesEnc > 0)}">
          <i class="ti ti-ball-football" style="font-size:16px;color:#f05e5e"></i>
          <div style="font-size:16px;font-weight:800;color:#f05e5e;margin-top:2px">${golesEnc}</div>
          <div style="font-size:8px;color:#7a9088;letter-spacing:1px">G.ENC.</div>
        </div>
        <div style="${cardStyle(portCero > 0)}">
          <i class="ti ti-lock" style="font-size:16px;color:#4cd97b"></i>
          <div style="font-size:16px;font-weight:800;color:#4cd97b;margin-top:2px">${portCero}</div>
          <div style="font-size:8px;color:#7a9088;letter-spacing:1px">P.CERO</div>
        </div>
        <div style="${cardStyle(penParados > 0)}">
          <i class="ti ti-hand-stop" style="font-size:16px;color:#4cd97b"></i>
          <div style="font-size:16px;font-weight:800;color:#4cd97b;margin-top:2px">${penParados}</div>
          <div style="font-size:8px;color:#7a9088;letter-spacing:1px">P.PARADOS</div>
        </div>
        <div style="${cardStyle(amarillas > 0)}">
          <i class="ti ti-rectangle-filled" style="font-size:16px;color:#e3b341"></i>
          <div style="font-size:16px;font-weight:800;color:#e3b341;margin-top:2px">${amarillas}</div>
          <div style="font-size:8px;color:#7a9088;letter-spacing:1px">AMAR.</div>
        </div>
        <div style="${cardStyle(rojas > 0)}">
          <i class="ti ti-rectangle-filled" style="font-size:16px;color:#f05e5e"></i>
          <div style="font-size:16px;font-weight:800;color:#f05e5e;margin-top:2px">${rojas}</div>
          <div style="font-size:8px;color:#7a9088;letter-spacing:1px">ROJAS</div>
        </div>
      </div>`;
  } else {
    const goles        = data.reduce((a,d) => a + (d.gol||0), 0);
    const penMarcados  = data.reduce((a,d) => a + (d.penalti_marcado||0), 0);
    const totalGoles   = goles + penMarcados;
    const asist        = data.reduce((a,d) => a + (d.asistencia||0), 0);
    const amarillas    = data.reduce((a,d) => a + (d.amarilla||0), 0);
    const rojas        = data.reduce((a,d) => a + (d.roja||0) + (d.doble_amarilla||0), 0);
    statsCards = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px">
        <div style="${cardStyle(totalGoles > 0)}">
          <i class="ti ti-ball-football" style="font-size:16px;color:white"></i>
          <div style="font-size:16px;font-weight:800;color:white;margin-top:2px">${totalGoles}${penMarcados > 0 ? ' (' + penMarcados + ')' : ''}</div>
          <div style="font-size:8px;color:#7a9088;letter-spacing:1px">GOLES</div>
        </div>
        <div style="${cardStyle(asist > 0)}">
          <i class="ti ti-shoe" style="font-size:16px;color:white"></i>
          <div style="font-size:16px;font-weight:800;color:white;margin-top:2px">${asist}</div>
          <div style="font-size:8px;color:#7a9088;letter-spacing:1px">ASIST.</div>
        </div>
        <div style="${cardStyle(amarillas > 0)}">
          <i class="ti ti-rectangle-filled" style="font-size:16px;color:#e3b341"></i>
          <div style="font-size:16px;font-weight:800;color:#e3b341;margin-top:2px">${amarillas}</div>
          <div style="font-size:8px;color:#7a9088;letter-spacing:1px">AMAR.</div>
        </div>
        <div style="${cardStyle(rojas > 0)}">
          <i class="ti ti-rectangle-filled" style="font-size:16px;color:#f05e5e"></i>
          <div style="font-size:16px;font-weight:800;color:#f05e5e;margin-top:2px">${rojas}</div>
          <div style="font-size:8px;color:#7a9088;letter-spacing:1px">ROJAS</div>
        </div>
      </div>`;
  }

  modal._historialData = { nombre, club, posicion, foto, escudo, total, maxPts, data };

  content.innerHTML =
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border)">' +
      '<div style="width:56px;height:56px;border-radius:50%;background:var(--surface);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:20px;color:var(--text-muted);flex-shrink:0;position:relative">' +
        (foto ? '<img loading="lazy" src="' + foto + '" width="56" height="56" style="object-fit:cover;border-radius:50%">' : nombre.substring(0,2).toUpperCase()) +
        (escudo ? '<img loading="lazy" src="' + escudo + '" width="18" height="18" style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;border-radius:50%;background:var(--bg2);border:1px solid var(--border)">' : '') +
      '</div>' +
      '<div style="flex:1">' +
        '<div style="font-family:var(--font-display);font-weight:700;font-size:18px;color:var(--text)">' + nombre + '</div>' +
        '<div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">' + posicion + '</div>' +
      '</div>' +
    '</div>' +
    statsCards +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
      '<span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);letter-spacing:1px">TOTAL: <strong style="color:var(--neon)">' + total + ' pts</strong></span>' +
      '<button onclick="compartirHistorial()" style="background:var(--green-brand);color:white;border:none;border-radius:8px;padding:8px 14px;font-family:var(--font-display);font-weight:700;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px"><i class="ti ti-share" style="font-size:15px"></i> Compartir</button>' +
    '</div>' +
    data.map(d => {
      const marcador = getMarcador(d);
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
        '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;min-width:90px">' +
          '<span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">J' + d.jornada + '</span>' +
          (d.rival ? '<span style="font-size:10px">' + (d.es_local ? '🏠' : '✈️') + '</span><span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">' + d.rival + '</span>' : '') +
          (marcador ? '<span style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-left:2px">(' + marcador + ')</span>' : '') +
        '</div>' +
        '<div style="flex:1;background:var(--surface);border-radius:4px;height:22px;overflow:hidden">' +
          '<div style="height:100%;width:' + Math.max((d.total_jornada / maxPts) * 100, 0) + '%;background:var(--neon);border-radius:4px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;min-width:' + (d.total_jornada > 0 ? '24px' : '0') + '">' +
            (d.total_jornada > 0 ? '<span style="font-family:var(--font-display);font-size:11px;color:#0d1117;font-weight:700">' + d.total_jornada + '</span>' : '') +
          '</div>' +
        '</div>' +
        (d.total_jornada <= 0 ? '<span style="font-family:var(--font-display);font-size:12px;color:var(--text-muted)">0</span>' : '') +
        iconos(d) +
      '</div>';
    }).join('');
}

document.getElementById('historial-close')?.addEventListener('click', () => document.getElementById('modal-historial').classList.remove('open'));
document.getElementById('modal-historial')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

async function compartirHistorial() {
  const modal = document.getElementById('modal-historial');
  const { nombre, club, posicion, foto, escudo, total, maxPts, data } = modal._historialData;

  const iconosTexto = (d) => {
    const items = [];
    if (d.puerta_cero) items.push('🔒');
    if (d.gol > 0) for (let i = 0; i < d.gol; i++) items.push('⚽');
    if (d.penalti > 0) for (let i = 0; i < d.penalti; i++) items.push(posicion === 'POR' ? '🧤' : '🎯');
    else if (d.penalti < 0) for (let i = 0; i < Math.abs(d.penalti); i++) items.push('❌');
    if (d.gol_pp > 0) for (let i = 0; i < d.gol_pp; i++) items.push('🔴');
    if (d.asistencia > 0) for (let i = 0; i < d.asistencia; i++) items.push('👟');
    if (d.doble_amarilla) items.push('🟨🟨');
    else if (d.amarilla) items.push('🟨');
    if (d.roja) items.push('🟥');
    const expulsado = d.doble_amarilla || d.roja;
    if (d.rol === 'titular' && d.minutos < 90 && d.minutos > 0 && !expulsado) items.push('🔄');
    return items.join('');
  };

  const tarjeta = document.createElement('div');
  tarjeta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:360px;background:#111816;border-radius:16px;overflow:hidden;font-family:Space Grotesk,sans-serif;padding:20px;border:1px solid rgba(76,217,123,0.2)';

  tarjeta.innerHTML =
    // Header logo
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">' +
      '<img src="https://rtmclmqzasktshlzwcyn.supabase.co/storage/v1/object/public/clubes/logo_asturfantasy_redondo.png" width="24" height="24" style="border-radius:6px">' +
      '<span style="color:white;font-weight:700;font-size:13px">Astur<span style="color:#4cd97b">Fantasy</span></span>' +
    '</div>' +
    // Jugador
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.07)">' +
      '<div style="width:52px;height:52px;border-radius:50%;background:#243028;border:2px solid rgba(76,217,123,0.3);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#7a9088;font-weight:700;font-size:16px">' +
        (foto ? '<img src="' + foto + '" width="52" height="52" style="object-fit:cover;border-radius:50%">' : nombre.substring(0,2).toUpperCase()) +
      '</div>' +
      '<div style="flex:1">' +
        '<div style="font-size:18px;font-weight:700;color:white">' + nombre + '</div>' +
        '<div style="font-size:11px;color:#7a9088">' + posicion + ' · ' + club + '</div>' +
      '</div>' +
      '<div style="text-align:right">' +
        '<div style="font-size:9px;color:#7a9088;letter-spacing:1px">TOTAL</div>' +
        '<div style="font-size:26px;font-weight:800;color:#4cd97b;line-height:1">' + total + '</div>' +
        '<div style="font-size:9px;color:#7a9088">pts</div>' +
      '</div>' +
    '</div>' +
    // Barras
    data.map(d =>
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">' +
        '<div style="display:flex;align-items:center;gap:3px;flex-shrink:0;min-width:76px">' +
          '<span style="font-size:10px;color:#7a9088">J' + d.jornada + '</span>' +
          (d.rival ? '<span style="font-size:9px">' + (d.es_local ? '🏠' : '✈️') + '</span><span style="font-size:9px;color:#7a9088">' + d.rival + '</span>' : '') +
        '</div>' +
        '<div style="flex:1;background:#243028;border-radius:3px;height:20px;overflow:hidden">' +
          '<div style="height:100%;width:' + Math.max((d.total_jornada / maxPts) * 100, 0) + '%;background:#4cd97b;border-radius:3px;display:flex;align-items:center;justify-content:flex-end;padding-right:5px;min-width:' + (d.total_jornada > 0 ? '22px' : '0') + '">' +
            (d.total_jornada > 0 ? '<span style="font-size:10px;color:#111816;font-weight:700">' + d.total_jornada + '</span>' : '') +
          '</div>' +
        '</div>' +
        (d.total_jornada <= 0 ? '<span style="font-size:11px;color:#7a9088">0</span>' : '') +
        (iconosTexto(d) ? '<span style="font-size:12px;flex-shrink:0">' + iconosTexto(d) + '</span>' : '') +
      '</div>'
    ).join('') +
    '<div style="margin-top:14px;text-align:center;font-size:10px;color:#4a5e58">asturfantasy.com</div>';

  document.body.appendChild(tarjeta);

  try {
    const canvas = await html2canvas(tarjeta, {
      backgroundColor: '#111816',
      scale: 2,
      useCORS: true,
    });
    document.body.removeChild(tarjeta);

    canvas.toBlob(async blob => {
      const file = new File([blob], nombre + '_historial.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: nombre + ' · AsturFantasy' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = nombre + '_historial.png'; a.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch (e) {
    if (document.body.contains(tarjeta)) document.body.removeChild(tarjeta);
    showToast('Error al compartir');
  }
}

document.getElementById('historial-close')?.addEventListener('click', () => document.getElementById('modal-historial').classList.remove('open'));
document.getElementById('modal-historial')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

document.getElementById('historial-close')?.addEventListener('click', () => document.getElementById('modal-historial').classList.remove('open'));
document.getElementById('modal-historial')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

/* ── PARTIDO ────────────────────────────────────────────── */
async function mostrarPartido(localAbrev, visitanteAbrev, localNombre, visitanteNombre, jornada, desdeConsulta = false) {
  if (!jornada) jornada = JORNADA_ACTIVA;
  const modal = document.getElementById('modal-partido');
  const content = document.getElementById('partido-content');
  const titulo = document.getElementById('partido-titulo');
  const { data: partidoDB } = await db.from('partidos').select('resultado_local, resultado_visitante, finalizado').eq('local_abrev', localAbrev).eq('jornada', jornada).single();
  const marcador = partidoDB?.finalizado ? ' ' + partidoDB.resultado_local + ' - ' + partidoDB.resultado_visitante : '';
  titulo.textContent = localNombre + marcador + ' ' + visitanteNombre;
  content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Cargando...</div>';
  modal.classList.add('open');

  const { data, error } = await db.from('jugadores')
    .select('nombre, club, posicion, rol, total_jornada, escudo_url, foto_url, minutos, puerta_cero, lne, gol, asistencia, penalti_marcado, gol_pp, amarilla, doble_amarilla, roja, puntos_entrenador, goles_encajados')
    .in('club', [localAbrev, visitanteAbrev]).eq('jornada', jornada).order('total_jornada', { ascending: false });

  if (error || !data?.length) { content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin datos</div>'; return; }

  const ordenPos = ['POR','DEF','MED','DEL'];

  const colorPos = p => p === 'POR' ? 'var(--pos-gk)' : p === 'DEF' ? 'var(--pos-def)' : p === 'MED' ? 'var(--pos-mid)' : p === 'DEL' ? 'var(--pos-fwd)' : p === 'ENT' ? 'var(--pos-ent)' : 'var(--surface)';

  const rj = (j, al) => '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer;flex-direction:' + (al === 'right' ? 'row-reverse' : 'row') + '" onclick="mostrarDesglose(' + JSON.stringify(j).replace(/"/g, '&quot;') + ')"><div style="position:relative;width:30px;height:30px;flex-shrink:0;border-radius:50%;background:' + colorPos(j.posicion) + ';padding:2px;box-sizing:border-box">' + (j.foto_url ? '<img loading="lazy" src="' + j.foto_url + '" width="26" height="26" style="object-fit:cover;border-radius:50%;width:100%;height:100%;border:1px solid var(--border)" onerror="this.style.display=\'none\'">' : '<div style="width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:10px;color:#0d1117">' + j.nombre.substring(0,2).toUpperCase() + '</div>') + (j.escudo_url ? '<img loading="lazy" src="' + j.escudo_url + '" width="11" height="11" style="position:absolute;bottom:-1px;right:-1px;object-fit:contain;border-radius:50%;background:white;border:1px solid rgba(0,0,0,0.2)">' : '') + '</div><div style="flex:1;min-width:0;text-align:' + (al === 'right' ? 'right' : 'left') + '"><div style="font-family:var(--font-display);font-weight:600;font-size:12px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + j.nombre + '</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted)">' + j.posicion + '</div></div><div style="font-family:var(--font-display);font-weight:700;font-size:15px;color:var(--neon);flex-shrink:0">' + j.total_jornada + '</div></div>';

  const seccion = (titulo, lista, al) => lista.length === 0 ? '' :
    '<div style="font-family:var(--font-mono);font-size:9px;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase;padding:8px 0 2px;text-align:' + (al === 'right' ? 'right' : 'left') + '">' + titulo + '</div>' +
    lista.map(j => rj(j, al)).join('');

  const renderEquipo = (jugadores, al) => {
    const titulares = jugadores.filter(j => j.rol === 'titular' && j.posicion !== 'ENT')
      .sort((a,b) => ordenPos.indexOf(a.posicion) - ordenPos.indexOf(b.posicion));
    const entrenadores = jugadores.filter(j => j.posicion === 'ENT');
    const suplentes = jugadores.filter(j => j.rol === 'suplente' && j.posicion !== 'ENT')
      .sort((a,b) => ordenPos.indexOf(a.posicion) - ordenPos.indexOf(b.posicion));
    return seccion('Titulares', titulares, al) +
           seccion('Entrenador', entrenadores, al) +
           seccion('Suplentes', suplentes, al);
  };

  const localJugadores     = data.filter(j => j.club === localAbrev);
  const visitanteJugadores = data.filter(j => j.club === visitanteAbrev);

  const tl = localJugadores.reduce((acc, j) => acc + (j.total_jornada || 0), 0);
  const tv = visitanteJugadores.reduce((acc, j) => acc + (j.total_jornada || 0), 0);

  const btnVolver = desdeConsulta ? '<button onclick="document.getElementById(\'modal-partido\').classList.remove(\'open\');abrirConsultaPuntos();" style="display:flex;align-items:center;gap:6px;background:none;border:none;color:var(--text-muted);font-family:var(--font-display);font-size:13px;cursor:pointer;padding:0;margin-bottom:12px">← Volver a partidos</button>' : '';

  content.innerHTML = btnVolver +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:60vh;overflow-y:auto;padding-right:4px">' +
      '<div>' +
        '<div style="font-family:var(--font-display);font-weight:700;font-size:13px;color:var(--text);text-align:center;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid var(--neon);position:sticky;top:0;background:var(--bg2);z-index:1">' + localNombre + ' <span style="color:var(--neon)">(' + tl + ')</span></div>' +
        renderEquipo(localJugadores, 'left') +
      '</div>' +
      '<div>' +
        '<div style="font-family:var(--font-display);font-weight:700;font-size:13px;color:var(--text);text-align:center;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid var(--neon);position:sticky;top:0;background:var(--bg2);z-index:1">' + visitanteNombre + ' <span style="color:var(--neon)">(' + tv + ')</span></div>' +
        renderEquipo(visitanteJugadores, 'right') +
      '</div>' +
    '</div>';
}

document.getElementById('partido-close')?.addEventListener('click', () => document.getElementById('modal-partido').classList.remove('open'));
document.getElementById('modal-partido')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });