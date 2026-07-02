/* ============================================================
   js/home.js  —  Pantalla de inicio
   ============================================================ */

let equipoAbrevActual = null;

async function loadHome() {
  document.getElementById('home-jornada-num').textContent = JORNADA_ACTIVA;
  const { data: sub } = await db.from('push_subscriptions').select('id').eq('user_id', currentUser.id).limit(1);
  actualizarToggleNotif(!!(sub?.length));
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
      document.getElementById('stat-media').textContent = media;
      if (JORNADA_VISIBLE > 0) {
        const { data: ganadorData } = await db.from('clasificacion_automatica')
          .select('nombre_equipo, puntos')
          .eq('jornada', JORNADA_VISIBLE)
          .order('puntos', { ascending: false })
          .limit(1)
          .single();
        const bannerGanador = document.getElementById('banner-ganador-jornada');
        if (bannerGanador && ganadorData) {
          bannerGanador.innerHTML = '🏆 <strong>' + ganadorData.nombre_equipo + '</strong> ganó la J' + JORNADA_VISIBLE + ' con <strong>' + ganadorData.puntos + ' pts</strong>';
          bannerGanador.style.display = 'block';
        }
      }
    }
  }

  // ── Carrusel de equipos ──
  const carrusel = document.getElementById('equipos-carrusel');
  if (carrusel && PARTIDOS.length) {
    const clubesVistos = new Set();
    const clubes = [];
    PARTIDOS.forEach(p => {
      if (!clubesVistos.has(p.local.abrev)) { clubesVistos.add(p.local.abrev); clubes.push(p.local); }
      if (!clubesVistos.has(p.visitante.abrev)) { clubesVistos.add(p.visitante.abrev); clubes.push(p.visitante); }
    });
    clubes.sort((a, b) => a.nombre.localeCompare(b.nombre));
    carrusel.innerHTML = clubes.map(c => `
      <div onclick="abrirEquipo('${c.abrev}', '${c.nombre}')"
           style="flex-shrink:0;width:52px;height:52px;border-radius:10px;
                  background:var(--surface);border:1px solid var(--border);
                  display:flex;align-items:center;justify-content:center;
                  cursor:pointer;transition:border-color 0.2s"
           onmouseover="this.style.borderColor='var(--neon)'"
           onmouseout="this.style.borderColor='var(--border)'">
        ${c.escudo_url
          ? `<img loading="lazy" src="${c.escudo_url}" width="36" height="36" style="object-fit:contain">`
          : `<span style="font-family:var(--font-display);font-weight:700;font-size:11px;color:var(--text)">${c.abrev}</span>`
        }
      </div>
    `).join('');
  }

  const container = document.getElementById('matches-container');
  if (!PARTIDOS.length) { container.innerHTML = '<div style="text-align:center;padding:32px 20px;font-family:var(--font-display);font-size:15px;color:var(--text-muted);letter-spacing:1px">Próxima jornada por confirmar</div>'; return; }

  const renderPartido = (p) => {
    const localImg = p.local.escudo_url ? '<img loading="lazy" src="' + p.local.escudo_url + '" alt="' + p.local.abrev + '" width="44" height="44" style="object-fit:contain">' : p.local.abrev;
    const visitanteImg = p.visitante.escudo_url ? '<img loading="lazy" src="' + p.visitante.escudo_url + '" alt="' + p.visitante.abrev + '" width="44" height="44" style="object-fit:contain">' : p.visitante.abrev;
    const centro = p.resultado?.finalizado
      ? '<div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--text);letter-spacing:2px">' + p.resultado.local + ' - ' + p.resultado.visitante + '</div><div style="font-family:var(--font-mono);font-size:9px;letter-spacing:2px;color:var(--neon);text-transform:uppercase;margin-bottom:2px">Final</div><button onclick="mostrarPartido(\'' + p.local.abrev + '\',\'' + p.visitante.abrev + '\',\'' + p.local.nombre + '\',\'' + p.visitante.nombre + '\')" style="background:var(--neon);color:#0d1117;border:none;border-radius:20px;padding:5px 12px;cursor:pointer;font-family:var(--font-display);font-weight:700;font-size:9px;letter-spacing:1px;text-transform:uppercase;margin-top:4px;width:100%">Puntos</button>'
      : '<div class="match-vs">' + p.estadio + '</div><div class="match-date">' + p.fecha + '</div>';
    return '<div class="match-card"><div class="match-team"><div class="crest" style="color:white;display:flex;align-items:center;justify-content:center">' + localImg + '</div><div><div class="team-name">' + p.local.nombre + '</div></div></div><div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;padding:0 8px;min-width:90px;max-width:110px">' + centro + '</div><div class="match-team right"><div class="crest" style="color:white;display:flex;align-items:center;justify-content:center">' + visitanteImg + '</div><div style="text-align:right"><div class="team-name">' + p.visitante.nombre + '</div></div></div></div>';
  };

  const INICIAL = 3;
  let mostrados = INICIAL;

  const renderTodos = () => {
    container.innerHTML = PARTIDOS.slice(0, mostrados).map(renderPartido).join('');
    if (mostrados < PARTIDOS.length) {
      const btnVerMas = document.createElement('button');
      btnVerMas.textContent = 'Ver más (' + (PARTIDOS.length - mostrados) + ')';
      btnVerMas.style.cssText = 'width:100%;margin-top:10px;padding:10px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:8px;font-family:var(--font-display);font-weight:600;font-size:13px;cursor:pointer';
      btnVerMas.onclick = () => { mostrados = PARTIDOS.length; renderTodos(); };
      container.appendChild(btnVerMas);
    }
  };

  renderTodos();

  // ── Clasificación competición ──
  if (document.getElementById('clasificacion-competicion-container')) return;

  const { data: clasif } = await db
    .from('clasificacion_competicion')
    .select('*')
    .order('posicion', { ascending: true });

  if (clasif?.length) {
    const total = clasif.length;
    const getBg = (pos) => {
      if (pos === 1) return 'rgba(0,100,50,0.4)';
      if (pos <= 5) return 'rgba(0,150,80,0.15)';
      if (pos > total - 3) return 'rgba(200,30,30,0.15)';
      return pos % 2 === 0 ? 'var(--surface)' : 'transparent';
    };
    const getBorder = (pos) => {
      if (pos === 1) return '1px solid rgba(0,180,90,0.4)';
      if (pos <= 5) return '1px solid rgba(0,180,90,0.15)';
      if (pos > total - 3) return '1px solid rgba(200,30,30,0.2)';
      return '1px solid transparent';
    };

    const clasifHtml = `
      <div id="clasificacion-competicion-container">
        <div class="section-label" style="margin-top:20px;margin-bottom:12px"><strong>CLASIFICACIÓN</strong></div>
        <div style="border-radius:10px;overflow:hidden;border:1px solid var(--border)">
          <div style="display:grid;grid-template-columns:28px 1fr 28px 28px 28px 28px 36px;
                      padding:6px 10px;font-family:var(--font-mono);font-size:9px;
                      letter-spacing:1px;color:var(--text-muted);text-transform:uppercase;
                      border-bottom:1px solid var(--border);background:var(--surface)">
            <span>#</span><span>Equipo</span><span style="text-align:center">PJ</span>
            <span style="text-align:center">G</span><span style="text-align:center">E</span>
            <span style="text-align:center">P</span><span style="text-align:right">Pts</span>
          </div>
          ${clasif.map(c => `
            <div style="display:grid;grid-template-columns:28px 1fr 28px 28px 28px 28px 36px;
                        padding:8px 10px;align-items:center;cursor:pointer;
                        background:${getBg(c.posicion)};
                        border-bottom:${getBorder(c.posicion)}"
                 onclick="abrirEquipoDesdeClasif('${c.abrev}', '${c.equipo}')">
              <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${c.posicion}</span>
              <div style="display:flex;align-items:center;gap:6px">
                ${c.escudo_url ? `<img src="${c.escudo_url}" width="18" height="18" style="object-fit:contain">` : ''}
                <span style="font-family:var(--font-display);font-size:12px;font-weight:600;color:var(--text)">${c.equipo}</span>
              </div>
              <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);text-align:center">${c.partidos}</span>
              <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);text-align:center">${c.ganados}</span>
              <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);text-align:center">${c.empatados}</span>
              <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);text-align:center">${c.perdidos}</span>
              <span style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--neon);text-align:right">${c.puntos}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.querySelector('#screen-home .page-body').insertAdjacentHTML('beforeend', clasifHtml);
  }
}

function cambiarTabEquipo(tab) {
  document.getElementById('tab-plantilla').classList.toggle('active', tab === 'plantilla');
  document.getElementById('tab-resultados').classList.toggle('active', tab === 'resultados');
  document.getElementById('equipo-grid').style.display = tab === 'plantilla' ? '' : 'none';
  document.getElementById('equipo-resultados').style.display = tab === 'resultados' ? '' : 'none';
  if (tab === 'resultados' && document.getElementById('equipo-resultados').innerHTML === '') {
    cargarResultadosEquipo(equipoAbrevActual);
  }
}

async function cargarResultadosEquipo(abrev) {
  const container = document.getElementById('equipo-resultados');
  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Cargando...</div>';
  const { data } = await db
    .from('partidos')
    .select('*')
    .or(`local_abrev.eq.${abrev},visitante_abrev.eq.${abrev}`)
    .order('jornada', { ascending: true });
  if (!data?.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Sin partidos</div>';
    return;
  }
  container.innerHTML = data.map(p => {
    const esLocal = p.local_abrev === abrev;
    const rival = esLocal ? p.visitante_nombre : p.local_nombre;
    const rivalEscudo = esLocal ? p.visitante_escudo_url : p.local_escudo_url;
    const golesA = esLocal ? p.resultado_local : p.resultado_visitante;
    const golesC = esLocal ? p.resultado_visitante : p.resultado_local;
    const resultado = p.finalizado ? (golesA > golesC ? 'V' : golesA === golesC ? 'E' : 'D') : '—';
    const colorResultado = resultado === 'V' ? 'var(--neon)' : resultado === 'D' ? 'var(--red)' : 'var(--text-muted)';
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer"
           onclick="mostrarPartido('${p.local_abrev}', '${p.visitante_abrev}', '${p.local_nombre}', '${p.visitante_nombre}', ${p.jornada})">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);width:20px;text-align:center">J${p.jornada}</div>
        <div style="font-size:14px;width:24px;text-align:center">${esLocal ? '🏠' : '✈️'}</div>
        ${rivalEscudo ? `<img src="${rivalEscudo}" width="24" height="24" style="object-fit:contain">` : ''}
        <div style="flex:1;font-family:var(--font-display);font-size:13px;font-weight:600;color:var(--text)">${rival}</div>
        ${p.finalizado ? `
          <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--text)">${golesA} - ${golesC}</div>
          <div style="font-family:var(--font-display);font-size:12px;font-weight:700;color:${colorResultado};width:24px;text-align:center">${resultado}</div>
        ` : `
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${p.fecha || 'Por confirmar'}</div>
        `}
      </div>
    `;
  }).join('');
}

async function abrirEquipo(abrev, nombre) {
  equipoAbrevActual = abrev;
  document.getElementById('equipo-nombre').textContent = nombre;
  document.getElementById('equipo-grid').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Cargando...</div>';
  document.getElementById('equipo-resultados').innerHTML = '';
  document.getElementById('equipo-grid').style.display = '';
  document.getElementById('equipo-resultados').style.display = 'none';
  document.getElementById('tab-plantilla').classList.add('active');
  document.getElementById('tab-resultados').classList.remove('active');

  goTo('equipo');

  const { data } = await db
    .from('ranking_jugadores')
    .select('nombre, posicion, puntos_total, foto_url, escudo_url, valor')
    .eq('club', abrev)
    .order('puntos_total', { ascending: false });

  if (!data?.length) {
    document.getElementById('equipo-grid').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Sin datos</div>';
    return;
  }

  const ordenPos = ['POR','DEF','MED','DEL','ENT'];
  const labels = { POR:'Porteros', DEF:'Defensas', MED:'Mediocampistas', DEL:'Delanteros', ENT:'Entrenador' };

  const sorted = [...data].sort((a,b) =>
    ordenPos.indexOf(a.posicion) - ordenPos.indexOf(b.posicion) ||
    b.puntos_total - a.puntos_total
  );

  let html = '';
  ordenPos.forEach(pos => {
    const jugadoresPos = sorted.filter(j => j.posicion === pos);
    if (!jugadoresPos.length) return;
    html += `
      <div style="grid-column:1/-1;font-family:var(--font-mono);font-size:10px;
                  letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);
                  padding:8px 0 4px;border-bottom:1px solid var(--border);margin-bottom:4px">
        ${labels[pos]}
      </div>
    `;
    html += jugadoresPos.map(j => `
      <div class="player-card">
        <div class="pc-avatar" style="position:relative;background:${POS_COLORS[j.posicion]};color:${POS_TEXT[j.posicion]};overflow:visible">
          ${j.foto_url
            ? `<img loading="lazy" src="${j.foto_url}" width="40" height="40"
                 style="object-fit:cover;border-radius:50%" onerror="this.style.display='none'">`
            : j.nombre.substring(0,2).toUpperCase()
          }
          ${j.escudo_url
            ? `<img loading="lazy" src="${j.escudo_url}" width="14" height="14"
                 style="position:absolute;bottom:-2px;right:-2px;object-fit:contain;
                        border-radius:50%;background:white;border:1px solid rgba(0,0,0,0.2)">`
            : ''}
        </div>
        <div class="pc-info">
          <div class="pc-name">${j.nombre}</div>
          <div class="pc-meta">${j.posicion} · ${j.valor}M</div>
        </div>
        <div class="pc-pts">${j.puntos_total}</div>
      </div>
    `).join('');
  });

  document.getElementById('equipo-grid').innerHTML = html;
}

async function abrirEquipoDesdeClasif(abrev, nombre) {
  await abrirEquipo(abrev, nombre);
}