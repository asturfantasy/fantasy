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
    actualizarToggleNotif(true);
    showToast('Notificaciones activadas');
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
  const { data: existente } = await db.from('push_subscriptions').select('id').eq('user_id', currentUser.id).single();
  if (existente) return;
  const registro = await navigator.serviceWorker.ready;
  const subscription = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: 'BKuhEIkRfRwx5RT6uZeVF_ZRhHQ_mVOVqgGfrBMhZ1KLwCaOvqoaabX3OeRt_k7Edi1nFguD9x5pS0_nI99bPQ0'
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
  const lnePts = j.lne === 1 ? 2 : j.lne === 2 ? 6 : j.lne === 3 ? 10 : 0;
  items.push({ label: 'Minutos (' + (j.minutos || 0) + ')', pts: (j.minutos || 0) >= 60 ? 2 : (j.minutos || 0) > 0 ? 1 : 0 });
  if (pcPts > 0) items.push({ label: 'Portería a cero', pts: (j.puerta_cero && (j.minutos || 0) >= 60) ? pcPts : 0 });
  items.push({ label: 'Nota LNE (' + (j.lne || 0) + ')', pts: lnePts });
  items.push({ label: 'Goles (' + (j.gol || 0) + ')', pts: (j.gol || 0) * golPts });
  items.push({ label: 'Asistencias (' + (j.asistencia || 0) + ')', pts: (j.asistencia || 0) * 3 });
  items.push({ label: 'Penaltis (' + (j.penalti || 0) + ')', pts: (j.penalti || 0) * 3 });
  items.push({ label: 'Gol PP (' + (j.gol_pp || 0) + ')', pts: (j.gol_pp || 0) * -2 });
  items.push({ label: 'Amarillas (' + (j.amarilla || 0) + ')', pts: (j.amarilla || 0) * -1 });
  items.push({ label: 'Doble amarilla (' + (j.doble_amarilla || 0) + ')', pts: (j.doble_amarilla || 0) * -3 });
  items.push({ label: 'Roja directa (' + (j.roja || 0) + ')', pts: (j.roja || 0) * -5 });
  if (j.posicion === 'POR' || j.posicion === 'DEF') items.push({ label: 'Goles encajados (' + (j.goles_encajados || 0) + ')', pts: -Math.floor((j.goles_encajados || 0) / 2) });
  return items;
}

function mostrarDesglose(j) {
  const modal = document.getElementById('modal-desglose');
  const content = document.getElementById('desglose-content');
  document.getElementById('desglose-titulo').textContent = j.nombre;
  const items = desgloseFn(j);
  content.innerHTML = items.length
    ? items.map(item => '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-family:var(--font-body);font-size:13px;color:var(--text-muted)">' + item.label + '</span><span style="font-family:var(--font-display);font-weight:700;font-size:15px;color:' + (item.pts >= 0 ? 'var(--neon)' : 'var(--red)') + '">' + (item.pts > 0 ? '+' : '') + item.pts + '</span></div>').join('') + '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;margin-top:4px"><span style="font-family:var(--font-display);font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:var(--text)">Total</span><span style="font-family:var(--font-display);font-weight:700;font-size:24px;color:var(--neon)">' + j.total_jornada + '</span></div>'
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

  const { data, error } = await db.from('jugadores')
    .select('jornada, total_jornada, escudo_url, foto_url, rival, es_local, gol, penalti, gol_pp, asistencia, amarilla, doble_amarilla, roja, puerta_cero, minutos, rol')
    .eq('nombre', nombre).eq('club', club).order('jornada', { ascending: true });

  if (error || !data?.length) {
    content.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin datos</div>';
    return;
  }

  const maxPts = Math.max(...data.map(d => d.total_jornada), 1);
  const total  = data.reduce((acc, d) => acc + d.total_jornada, 0);
  const foto   = data[0]?.foto_url || '';
  const escudo = data[0]?.escudo_url || '';

  const iconos = (d) => {
    const items = [];

    // Portería a cero
    if (d.puerta_cero) items.push('<span title="Portería a cero" style="font-size:14px">🔒</span>');

    // Goles normales
    if (d.gol > 0) {
      for (let i = 0; i < d.gol; i++)
        items.push('<span title="Gol" style="font-size:14px">⚽</span>');
    }

    // Penalti según posición
    if (d.penalti > 0) {
      for (let i = 0; i < d.penalti; i++) {
        if (posicion === 'POR')
          items.push('<span title="Penalti parado" style="font-size:14px">🧤</span>');
        else
          items.push('<span title="Gol de penalti" style="font-size:14px">🎯</span>');
      }
    } else if (d.penalti < 0) {
      for (let i = 0; i < Math.abs(d.penalti); i++)
        items.push('<span title="Penalti fallado" style="font-size:14px">❌</span>');
    }

    // Gol en propia puerta
    if (d.gol_pp > 0) {
      for (let i = 0; i < d.gol_pp; i++)
        items.push('<span title="Gol en propia puerta" style="font-size:14px">🔴</span>');
    }

    // Asistencias
    if (d.asistencia > 0) {
      for (let i = 0; i < d.asistencia; i++)
        items.push('<span title="Asistencia" style="font-size:14px">👟</span>');
    }

    // Tarjetas
    if (d.doble_amarilla) {
      items.push('<span title="Doble amarilla" style="font-size:14px">🟨🟨</span>');
    } else if (d.amarilla) {
      items.push('<span title="Amarilla" style="font-size:14px">🟨</span>');
    }
    if (d.roja) items.push('<span title="Roja directa" style="font-size:14px">🟥</span>');

    // Sustituido: titular que no llega a 90 min y no fue expulsado
    const expulsado = d.doble_amarilla || d.roja;
    if (d.rol === 'titular' && d.minutos < 90 && d.minutos > 0 && !expulsado) {
      items.push('<span title="Sustituido (' + d.minutos + ' min)" style="font-size:14px">🔄</span>');
    }

    return items.length
      ? '<div style="display:flex;gap:2px;align-items:center;flex-shrink:0">' + items.join('') + '</div>'
      : '';
  };

  content.innerHTML =
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)">' +
      '<div style="width:56px;height:56px;border-radius:50%;background:var(--surface);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:20px;color:var(--text-muted);flex-shrink:0;position:relative">' +
        (foto ? '<img loading="lazy" src="' + foto + '" width="56" height="56" style="object-fit:cover;border-radius:50%">' : nombre.substring(0,2).toUpperCase()) +
        (escudo ? '<img loading="lazy" src="' + escudo + '" width="18" height="18" style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;border-radius:50%;background:var(--bg2);border:1px solid var(--border)">' : '') +
      '</div>' +
      '<div>' +
        '<div style="font-family:var(--font-display);font-weight:700;font-size:18px;color:var(--text)">' + nombre + '</div>' +
        '<div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">' + posicion + '</div>' +
      '</div>' +
    '</div>' +
    '<div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);text-align:right;margin-bottom:14px;letter-spacing:1px">TOTAL: <strong style="color:var(--neon)">' + total + ' pts</strong></div>' +
    data.map(d =>
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
        '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;min-width:80px">' +
          '<span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">J' + d.jornada + '</span>' +
          (d.rival ? '<span style="font-size:10px">' + (d.es_local ? '🏠' : '✈️') + '</span><span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">' + d.rival + '</span>' : '') +
        '</div>' +
        '<div style="flex:1;background:var(--surface);border-radius:4px;height:22px;overflow:hidden">' +
          '<div style="height:100%;width:' + Math.max((d.total_jornada / maxPts) * 100, 0) + '%;background:var(--neon);border-radius:4px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;min-width:' + (d.total_jornada > 0 ? '24px' : '0') + '">' +
            (d.total_jornada > 0 ? '<span style="font-family:var(--font-display);font-size:11px;color:#0d1117;font-weight:700">' + d.total_jornada + '</span>' : '') +
          '</div>' +
        '</div>' +
        (d.total_jornada <= 0 ? '<span style="font-family:var(--font-display);font-size:12px;color:var(--text-muted)">0</span>' : '') +
        iconos(d) +
      '</div>'
    ).join('');
}

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
    .select('nombre, club, posicion, rol, total_jornada, escudo_url, foto_url, minutos, puerta_cero, lne, gol, asistencia, penalti, gol_pp, amarilla, doble_amarilla, roja, puntos_entrenador, goles_encajados')
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