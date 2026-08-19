const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key, { realtime: { transport: WebSocket }});

const channel = supabase.channel('test_channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'aulas' }, (payload) => {
    console.log("PAYLOAD RECEIVED:", payload.eventType);
    process.exit(0);
  })
  .subscribe(async (status) => {
    console.log("Status:", status);
    if (status === 'SUBSCRIBED') {
      const { data: v } = await supabase.from('versoes_grade').select('id').limit(1);
      const { data: t } = await supabase.from('turmas').select('id').limit(1);
      const { data: d } = await supabase.from('disciplinas').select('id').limit(1);
      const { data: s } = await supabase.from('slots_horarios').select('id').limit(1);
      const { error } = await supabase.from('aulas').insert({
        turma_id: t[0].id,
        disciplina_id: d[0].id,
        dia_semana: "SEGUNDA",
        slot_horario_id: s[0].id,
        versao_id: v[0].id
      });
      console.log("Insert completed, error:", error);
    }
  });

setTimeout(() => {
  console.log("Timeout! No payload received.");
  process.exit(1);
}, 5000);
