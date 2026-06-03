/* ============================================================
   js/ligas.js  —  Ligas privadas
   ============================================================ */

const MAX_LIGAS = 5;

function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function loadLigas() {
  const container = document.getElementById('rtab-ligas');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Cargando...</div>';

  // Ligas del usuario
  const { data: miembros } = await db.from('liga_miembros')
    .select('liga_id, ligas(id, nombre, codigo, creador_id)')
    .eq('user_id', currentUser.id);

  const misLigas = (miembros || []).map(m => m.ligas).filter(Boolean);

  container.innerHTML =
    // Cabecera con botones
    '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">' +
      '<button onclick="mostrarCrearLiga()" style="flex:1;padding:10px;background:var(--neon);color:#0d1117;border:none;border-radius:8px;font-family:var(--font-display);font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px"><i class="ti ti-plus"></i> Crear liga</button>' +
      '<button onclick="mostrarUnirLiga()" style="flex:1;padding:10px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;font-family:var(--font-display);font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px"><i class="ti ti-door-enter"></i> Unirse a liga</button>' +
    '</div>' +
    '<div id="ligas-form" style="display:none;margin-bottom:16px"></div>' +
    // Lista de ligas
    (misLigas.length === 0
      ? '<div style="text-align:center;padding:28px;color:var(--text-muted);font-family:var(--font-mono);font-size:12px">Aún no estás en ninguna liga privada</div>'
      : misLigas.map(l =>
          '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;margin-bottom:10px;overflow:hidden">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border)">' +
              '<div>' +
                '<div style="font-size:14px;font-weight:700;color:var(--text)">' + l.nombre + '</div>' +
                '<div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);margin-top:2px">Código: <strong style="color:var(--neon);letter-spacing:2px">' + l.codigo + '</strong></div>' +
              '</div>' +
              '<div style="display:flex;gap:6px">' +
                '<button onclick="copiarCodigo(\'' + l.codigo + '\')" style="padding:5px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text-muted);font-family:var(--font-display);font-size:11px;cursor:pointer"><i class="ti ti-copy"></i></button>' +
                (l.creador_id === currentUser.id
                  ? '<button onclick="eliminarLiga(\'' + l.id + '\')" style="padding:5px 10px;background:rgba(248,81,73,0.1);border:1px solid rgba(248,81,73,0.3);border-radius:6px;color:var(--red);font-family:var(--font-display);font-size:11px;cursor:pointer"><i class="ti ti-trash"></i></button>'
                  : '<button onclick="salirLiga(\'' + l.id + '\')" style="padding:5px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text-muted);font-family:var(--font-display);font-size:11px;cursor:pointer">Salir</button>') +
              '</div>' +
            '</div>' +
            '<div id="tabla-liga-' + l.id + '" style="max-height:300px;overflow-y:auto"></div>' +
          '</div>'
        ).join('')
    ) +
    '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);text-align:center;margin-top:8px">' + misLigas.length + ' / ' + MAX_LIGAS + ' ligas</div>';

  // Cargar clasificaciones de cada liga
  misLigas.forEach(l => cargarClasificacionLiga(l.id));
}

async function cargarClasificacionLiga(ligaId) {
  const container = document.getElementById('tabla-liga-' + ligaId);
  if (!container) return;

  const { data: miembros } = await db.from('liga_miembros').select('user_id').eq('liga_id', ligaId);
  const userIds = (miembros || []).map(m => m.user_id);

  if (!userIds.length) { container.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:12px">Sin miembros</div>'; return; }

  const { data: general } = await db.from('clasificacion_general_auto').select('*').in('user_id', userIds);
  const sorted = (general || []).sort((a, b) => b.puntos_total - a.puntos_total);

  container.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
    sorted.map((r, i) => {
      const esYo = r.user_id === currentUser.id;
      return '<tr style="' + (esYo ? 'background:rgba(0,217,126,0.06);' : '') + '">' +
        '<td style="padding:8px 12px;width:32px"><span style="font-family:var(--font-mono);font-size:12px;color:' + (i === 0 ? '#e3b341' : i === 1 ? '#8b949e' : i === 2 ? '#cd7f32' : 'var(--text-muted)') + '">' + (i+1) + '</span></td>' +
        '<td style="padding:8px 4px"><div style="font-family:var(--font-display);font-size:13px;font-weight:600;color:var(--text)">' + (esYo ? '⭐ ' : '') + r.nombre_equipo + '</div></td>' +
        '<td style="padding:8px 12px;text-align:right"><div style="font-family:var(--font-display);font-weight:700;font-size:15px;color:var(--neon)">' + r.puntos_total + '</div></td>' +
      '</tr>';
    }).join('') +
  '</table>';
}

function mostrarCrearLiga() {
  const form = document.getElementById('ligas-form');
  form.style.display = 'block';
  form.innerHTML =
    '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:16px">' +
      '<div style="font-size:13px;font-weight:700;margin-bottom:12px">Crear nueva liga</div>' +
      '<div style="margin-bottom:10px">' +
        '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:1px;margin-bottom:6px">NOMBRE DE LA LIGA</div>' +
        '<input id="nueva-liga-nombre" type="text" placeholder="Ej: Liga del trabajo" maxlength="40" style="width:100%;padding:8px 12px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;font-family:var(--font-display);font-size:13px">' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button onclick="crearLiga()" style="flex:1;padding:9px;background:var(--neon);color:#0d1117;border:none;border-radius:8px;font-family:var(--font-display);font-weight:700;font-size:13px;cursor:pointer">Crear</button>' +
        '<button onclick="document.getElementById(\'ligas-form\').style.display=\'none\'" style="padding:9px 14px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;font-family:var(--font-display);font-size:13px;cursor:pointer">Cancelar</button>' +
      '</div>' +
    '</div>';
}

function mostrarUnirLiga() {
  const form = document.getElementById('ligas-form');
  form.style.display = 'block';
  form.innerHTML =
    '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:16px">' +
      '<div style="font-size:13px;font-weight:700;margin-bottom:12px">Unirse a una liga</div>' +
      '<div style="margin-bottom:10px">' +
        '<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:1px;margin-bottom:6px">CÓDIGO DE INVITACIÓN</div>' +
        '<input id="codigo-liga" type="text" placeholder="Ej: AB3X7Z" maxlength="6" style="width:100%;padding:8px 12px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;font-family:var(--font-mono);font-size:16px;letter-spacing:4px;text-transform:uppercase">' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button onclick="unirseALiga()" style="flex:1;padding:9px;background:var(--neon);color:#0d1117;border:none;border-radius:8px;font-family:var(--font-display);font-weight:700;font-size:13px;cursor:pointer">Unirse</button>' +
        '<button onclick="document.getElementById(\'ligas-form\').style.display=\'none\'" style="padding:9px 14px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;font-family:var(--font-display);font-size:13px;cursor:pointer">Cancelar</button>' +
      '</div>' +
    '</div>';
}

async function crearLiga() {
  const nombre = document.getElementById('nueva-liga-nombre')?.value.trim();
  if (!nombre) { showToast('Escribe un nombre para la liga', true); return; }

  // Comprobar límite
  const { data: misLigas } = await db.from('liga_miembros').select('liga_id').eq('user_id', currentUser.id);
  if ((misLigas || []).length >= MAX_LIGAS) { showToast('Máximo ' + MAX_LIGAS + ' ligas por usuario', true); return; }

  const codigo = generarCodigo();

  const { data: liga, error } = await db.from('ligas').insert({
    nombre,
    codigo,
    creador_id: currentUser.id
  }).select().single();

  if (error) { showToast('Error al crear la liga', true); return; }

  // Unirse automáticamente como creador
  await db.from('liga_miembros').insert({ liga_id: liga.id, user_id: currentUser.id });

  showToast('¡Liga creada! Código: ' + codigo);
  loadLigas();
}

async function unirseALiga() {
  const codigo = document.getElementById('codigo-liga')?.value.trim().toUpperCase();
  if (!codigo || codigo.length !== 6) { showToast('Introduce un código válido (6 caracteres)', true); return; }

  // Comprobar límite
  const { data: misLigas } = await db.from('liga_miembros').select('liga_id').eq('user_id', currentUser.id);
  if ((misLigas || []).length >= MAX_LIGAS) { showToast('Máximo ' + MAX_LIGAS + ' ligas por usuario', true); return; }

  // Buscar liga
  const { data: liga, error: ligaError } = await db.from('ligas').select('id, nombre').eq('codigo', codigo).single();
  if (ligaError || !liga) { showToast('Código no encontrado', true); return; }

  // Comprobar si ya es miembro
  const { data: yaMiembro } = await db.from('liga_miembros').select('liga_id').eq('liga_id', liga.id).eq('user_id', currentUser.id).single();
  if (yaMiembro) { showToast('Ya eres miembro de esta liga', true); return; }

  const { error } = await db.from('liga_miembros').insert({ liga_id: liga.id, user_id: currentUser.id });
  if (error) { showToast('Error al unirse a la liga', true); return; }

  showToast('¡Te has unido a ' + liga.nombre + '!');
  loadLigas();
}

async function eliminarLiga(ligaId) {
  if (!confirm('¿Seguro que quieres eliminar esta liga? Se eliminará para todos los miembros.')) return;
  const { error } = await db.from('ligas').delete().eq('id', ligaId);
  if (error) { showToast('Error al eliminar la liga', true); return; }
  showToast('Liga eliminada');
  loadLigas();
}

async function salirLiga(ligaId) {
  if (!confirm('¿Seguro que quieres salir de esta liga?')) return;
  const { error } = await db.from('liga_miembros').delete().eq('liga_id', ligaId).eq('user_id', currentUser.id);
  if (error) { showToast('Error al salir de la liga', true); return; }
  showToast('Has salido de la liga');
  loadLigas();
}

function copiarCodigo(codigo) {
  navigator.clipboard.writeText(codigo).then(() => showToast('Código copiado: ' + codigo));
}