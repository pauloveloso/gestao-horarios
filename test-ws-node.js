const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Provide custom WebSocket to Supabase client
const supabase = createClient(url, key, {
  realtime: {
    transport: WebSocket
  }
});

const channel = supabase.channel('test_channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'aulas' }, (payload) => {
    console.log("PAYLOAD RECEIVED:", payload);
  })
  .subscribe(async (status) => {
    console.log("Status:", status);
    if (status === 'SUBSCRIBED') {
      const { error } = await supabase.from('aulas').insert({
        turma_id: "e4ed1d03-b054-4f05-8dc8-1647f2db3a1b",
        disciplina_id: "e4ed1d03-b054-4f05-8dc8-1647f2db3a1b",
        dia_semana: "SEGUNDA",
        slot_horario_id: "e4ed1d03-b054-4f05-8dc8-1647f2db3a1b",
        versao_id: "e4ed1d03-b054-4f05-8dc8-1647f2db3a1b"
      });
      console.log("Insert completed, error:", error);
    }
  });

setTimeout(() => process.exit(0), 10000);
