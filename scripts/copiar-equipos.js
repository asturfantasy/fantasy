const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  try {
    const { data: config } = await supabase
      .from('config_jornada')
      .select('jornada_activa, deadline')
      .eq('id', 1)
      .single();

    const jornadaActiva = config?.jornada_activa;
    const deadline = config?.deadline;

    if (!jornadaActiva || !deadline) {
      console.log('Sin config');
      return;
    }

    const ahora = new Date();
    const deadlineDate = new Date(deadline);
    if (ahora < deadlineDate) {
      console.log('Deadline no pasado:', deadline);
      return;
    }

    const { data: yaCopiada } = await supabase
      .from('jornadas_copiadas')
      .select('id')
      .eq('jornada', jornadaActiva)
      .maybeSingle();

    if (yaCopiada) {
      console.log('J' + jornadaActiva + ' ya copiada');
      return;
    }

    const { data: equipos } = await supabase
      .from('mi_equipo')
      .select('*')
      .eq('jornada', jornadaActiva);

    if (!equipos?.length) {
      await supabase.from('jornadas_copiadas').insert({ jornada: jornadaActiva });
      console.log('Sin equipos que copiar');
      return;
    }

    await supabase.from('mi_equipo').delete().eq('jornada', jornadaActiva + 1);

    await supabase.from('mi_equipo').insert(
      equipos.map(e => ({
        user_id: e.user_id,
        jugador_id: e.jugador_id,
        jornada: jornadaActiva + 1,
        formacion: e.formacion,
        capitan: e.capitan
      }))
    );

    await supabase.from('jornadas_copiadas').insert({ jornada: jornadaActiva });
    console.log('Equipos copiados de J' + jornadaActiva + ' a J' + (jornadaActiva + 1));

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();