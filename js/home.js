/* ============================================================
   js/home.js  —  Pantalla de inicio
   ============================================================ */

async function loadHome() {
  document.getElementById('home-jornada-num').textContent = JORNADA_ACTIVA;
  const { data: sub } = await db.from('push_subscriptions').select('id').eq('user_id', currentUser.id).limit(1);
  actualizarToggleNotif(!!(sub?.length));
  const userName = currentUser?.user_metadata?.full_name?.split(' ')[0] || 'crack';
  const bienvenida = document.getElementById('home-bienvenida');
  const hora = new Date().getHours();
  const saludo = hora < 14 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches';
  //if (bienvenida) bienvenida.textContent = '¡' + saludo + ', ' + userName + '!';
  const ahora = new Date();
  const enDirecto = ahora > new Date(DEADLINE_JORNADA) && ahora < new Date(window.FECHA_FIN);
  const bannerAviso = document.getElementById('card-mensaje-home');
  if (bannerAviso) { if (window.MENSAJE_AVISO) { bannerAviso.textContent = window.MENSAJE_AVISO; bannerAviso.style.display = 'block'; } else bannerAviso.style.display = 'none'; }
  const tituloJornada = document.getElementById('titulo-jornada-home');
  if (tituloJornada) tituloJornada.textContent = window.TITULO_JORNADA || '';
  const bannerDirecto = document.getElementById('banner-en-directo');
  if (bannerDirecto) bannerDirecto.style.display = enDirecto ? 'block' : 'none';
  const btnJ = document.getElementById('btn-jornada-visible');
  if (btnJ) btnJ.textContent = JORNADA_VISIBLE;

  if (JORNADA_VISIBLE && currentUser) {
    document.getElementById('stat-jornada-label').textContent = JORNADA_VISIBLE;
    document.getElementById('stat-media-label').textContent = 'jornada ' + JORNADA_VISIBLE;
    const [{ data: clGeneral }, { data: clSemanal }, { data: mediaData }] = await Promise.all([
      db.from('clasificacion_general_auto').select('*'),
      db.from('clasificacion_automatica').select('puntos').eq('jornada', JORNADA_VISIBLE).eq('user_id', currentUser.id).single(),
      db.from('clasificacion_automatica').select('puntos').eq('jornada', JORNADA_VISIBLE)
    ]);
    if (clGeneral?.length) {
      const miPos = clGeneral.findIndex(r => r.user_id === currentUser.id);
      const posEl = document.getElementById('stat-posicion');
      if (posEl) posEl.textContent = miPos >= 0 ? (miPos + 1) + 'º' : '—';
    }
    if (clSemanal?.puntos !== undefined) {
      document.getElementById('stat-puntos').textContent = clSemanal.puntos;
      const media = mediaData?.length ? Math.round(mediaData.reduce((acc, r) => acc + r.puntos, 0) / mediaData.length) : 0;
      const diff = clSemanal.puntos - media;
      const deltaEl = document.getElementById('stat-puntos-delta');
      if (deltaEl) { deltaEl.textContent = diff >= 0 ? '+' + diff + ' vs media' : diff + ' vs media'; deltaEl.style.color = diff >= 0 ? 'var(--neon)' : 'var(--red)'; }
      document.getElementById('stat-media').textContent = media;
    }
  }

  const container = document.getElementById('matches-container');
  if (!PARTIDOS.length) { container.innerHTML = '<div style="text-align:center;padding:32px 20px;font-family:var(--font-display);font-size:15px;color:var(--text-muted);letter-spacing:1px">Próxima jornada por confirmar</div>'; return; }
  container.innerHTML = PARTIDOS.map(p => {
    const localImg = p.local.escudo_url ? '<img loading="lazy" src="' + p.local.escudo_url + '" alt="' + p.local.abrev + '" width="44" height="44" style="object-fit:contain">' : p.local.abrev;
    const visitanteImg = p.visitante.escudo_url ? '<img loading="lazy" src="' + p.visitante.escudo_url + '" alt="' + p.visitante.abrev + '" width="44" height="44" style="object-fit:contain">' : p.visitante.abrev;
    const centro = p.resultado?.finalizado
      ? '<div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--text);letter-spacing:2px">' + p.resultado.local + ' - ' + p.resultado.visitante + '</div><div style="font-family:var(--font-mono);font-size:9px;letter-spacing:2px;color:var(--neon);text-transform:uppercase;margin-bottom:2px">Final</div><button onclick="mostrarPartido(\'' + p.local.abrev + '\',\'' + p.visitante.abrev + '\',\'' + p.local.nombre + '\',\'' + p.visitante.nombre + '\')" style="background:var(--neon);color:#0d1117;border:none;border-radius:20px;padding:5px 12px;cursor:pointer;font-family:var(--font-display);font-weight:700;font-size:9px;letter-spacing:1px;text-transform:uppercase;margin-top:4px;width:100%">Ver puntos</button>'
      : '<div class="match-vs">' + p.estadio + '</div><div class="match-date">' + p.fecha + '</div>';
    return '<div class="match-card"><div class="match-team"><div class="crest" style="color:white;display:flex;align-items:center;justify-content:center">' + localImg + '</div><div><div class="team-name">' + p.local.nombre + '</div></div></div><div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;padding:0 8px;min-width:90px;max-width:110px">' + centro + '</div><div class="match-team right"><div class="crest" style="color:white;display:flex;align-items:center;justify-content:center">' + visitanteImg + '</div><div style="text-align:right"><div class="team-name">' + p.visitante.nombre + '</div></div></div></div>';
  }).join('');
}
