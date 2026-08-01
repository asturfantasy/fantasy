const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function generarEquipoAleatorio(userId, jornadaSiguiente, presupuesto, formacion = '3-4-3') {
  const { data: jugadores } = await supabase
    .from('jugadores')
    .select('id, posicion, valor, club, activo')
    .eq('jornada', jornadaSiguiente)
    .eq('activo', 1);

  if (!jugadores?.length) return;

  const porPos = { POR: [], DEF: [], MED: [], DEL: [], ENT: [] };
  jugadores.forEach(j => { if (porPos[j.posicion]) porPos[j.posicion].push(j); });

  const necesarios = { POR: 1, DEF: 3, MED: 4, DEL: 3, ENT: 1 };
  const selAuto = [];
  const usados = new Set();
  const clubCount = {};
  let coste = 0;
  let exito = true;

  for (const pos of ['POR', 'DEF', 'MED', 'DEL', 'ENT']) {
    const cantidad = necesarios[pos];
    const candidatos = porPos[pos]
      .filter(j => !usados.has(j.id) && (clubCount[j.club] || 0) < 2)
      .sort(() => Math.random() - 0.5);

    let selPos = [];
    for (const j of candidatos) {
      if (selPos.length >= cantidad) break;
      if (coste + (parseFloat(j.valor) || 0) <= presupuesto * 0.98) {
        selPos.push(j);
        coste += parseFloat(j.valor) || 0;
      }
    }

    if (selPos.length < cantidad) { exito = false; break; }
    selPos.forEach(j => {
      selAuto.push(j);
      usados.add(j.id);
      clubCount[j.club] = (clubCount[j.club] || 0) + 1;
    });
  }

  if (!exito) return;

  const capitan = selAuto.filter(j => j.posicion === 'DEL')
    .sort((a, b) => (b.valor || 0) - (a.valor || 0))[0]?.id || selAuto[0]?.id;

  await supabase.from('mi_equipo').delete()
    .eq('user_id', userId).eq('jornada', jornadaSiguiente);

  await supabase.from('mi_equipo').insert(
    selAuto.map(j => ({
      user_id: userId,
      jugador_id: j.id,
      jornada: jornadaSiguiente,
      formacion,
      capitan: capitan === j.id
    }))
  );
}

async function main() {
  try {
    const presupuesto = 100;
    const ahora = new Date();

    // Obtener la última jornada cuyo deadline ya pasó
    const { data: jornadaData } = await supabase
      .from('jornadas')
      .select('jornada, deadline')
      .lt('deadline', ahora.toISOString())
      .order('jornada', { ascending: false })
      .limit(1)
      .single();

    if (!jornadaData) { console.log('Sin jornadas con deadline pasado'); return; }

    const jornadaActiva = jornadaData.jornada;
    const deadline = jornadaData.deadline;

    console.log('Jornada activa:', jornadaActiva, 'Deadline:', deadline);

    // Comprobar si ya se copió esta jornada
    const { data: yaCopiada } = await supabase
      .from('jornadas_copiadas')
      .select('id')
      .eq('jornada', jornadaActiva)
      .maybeSingle();

    if (yaCopiada) { console.log('J' + jornadaActiva + ' ya copiada'); return; }

    const jornadaSiguiente = jornadaActiva + 1;

    // Obtener equipos de jornadaActiva
    const { data: equipos } = await supabase
      .from('mi_equipo')
      .select('*')
      .eq('jornada', jornadaActiva);

    if (!equipos?.length) {
      await supabase.from('jornadas_copiadas').insert({ jornada: jornadaActiva });
      console.log('Sin equipos que copiar');
      return;
    }

    // Obtener jugadores de jornadaActiva para cruzar nombre+club
    const idsActiva = [...new Set(equipos.map(e => e.jugador_id))];
    const { data: jugadoresActiva } = await supabase
      .from('jugadores')
      .select('id, nombre, club, posicion')
      .in('id', idsActiva)
      .eq('jornada', jornadaActiva);

    // Obtener jugadores de jornadaSiguiente
    const { data: jugadoresSiguiente } = await supabase
      .from('jugadores')
      .select('id, nombre, club, valor')
      .eq('jornada', jornadaSiguiente);

    // Borrar equipos existentes en jornadaSiguiente
    await supabase.from('mi_equipo').delete().eq('jornada', jornadaSiguiente);

    // Agrupar por usuario
    const equiposPorUser = {};
    equipos.forEach(e => {
      if (!equiposPorUser[e.user_id]) equiposPorUser[e.user_id] = [];
      equiposPorUser[e.user_id].push(e);
    });

    for (const [userId, equipo] of Object.entries(equiposPorUser)) {
      let costeTotal = 0;
      const equipoConvertido = [];

      for (const e of equipo) {
        const jugActiva = jugadoresActiva?.find(j => j.id === e.jugador_id);
        if (!jugActiva) continue;

        const jugSiguiente = jugadoresSiguiente?.find(j => j.nombre === jugActiva.nombre && j.club === jugActiva.club);
        if (!jugSiguiente) continue;

        costeTotal += parseFloat(jugSiguiente.valor) || 0;
        equipoConvertido.push({ ...e, jugador_id_siguiente: jugSiguiente.id, valor: jugSiguiente.valor });
      }

      if (costeTotal > presupuesto) {
        console.log('Usuario ' + userId + ' supera presupuesto (' + costeTotal.toFixed(1) + 'M) → equipo aleatorio');
        await generarEquipoAleatorio(userId, jornadaSiguiente, presupuesto, equipo[0]?.formacion);
      } else {
        await supabase.from('mi_equipo').insert(
          equipoConvertido.map(e => ({
            user_id: e.user_id,
            jugador_id: e.jugador_id_siguiente,
            jornada: jornadaSiguiente,
            formacion: e.formacion,
            capitan: e.capitan
          }))
        );
        console.log('Usuario ' + userId + ' copiado correctamente (' + costeTotal.toFixed(1) + 'M)');
      }
    }

    await supabase.from('jornadas_copiadas').insert({ jornada: jornadaActiva });
    console.log('Proceso completado para J' + jornadaActiva + ' → J' + jornadaSiguiente);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();