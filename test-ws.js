const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const channel = supabase.channel('aulas_test')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'aulas' }, payload => {
    console.log('Received payload!', payload);
  })
  .subscribe(async (status) => {
    console.log("Status:", status);
    if (status === 'SUBSCRIBED') {
      const payload = {
        turma_id: "0a53ea3e-a1ab-443b-a9b8-b4b9b9a71465", // dummy UUID, we need real ones but wait, let's use valid data
      };
      // actually let's just insert one using valid UUIDs from db
      const { data: t } = await supabase.from('turmas').select('id').limit(1);
      const { data: d } = await supabase.from('disciplinas').select('id').limit(1);
      const { data: s } = await supabase.from('slots_horarios').select('id').limit(1);
      const { data: v } = await supabase.from('versoes_grade').select('id').limit(1);

      if(t[0] && d[0] && s[0] && v[0]) {
        console.log("Inserting aula...");
        const { error } = await supabase.from('aulas').insert({
          turma_id: t[0].id,
          disciplina_id: d[0].id,
          dia_semana: "SEGUNDA",
          slot_horario_id: s[0].id,
          versao_id: v[0].id
        });
        if(error) console.error("Insert error:", error);
      }
    }
  });

setTimeout(() => process.exit(0), 5000);
