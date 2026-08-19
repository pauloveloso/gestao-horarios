const { createBrowserClient } = require('@supabase/ssr');
require('dotenv').config({ path: '.env.local' });

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { error } = await supabase.from('aulas').insert({
    turma_id: "e4ed1d03-b054-4f05-8dc8-1647f2db3a1b",
    disciplina_id: "e4ed1d03-b054-4f05-8dc8-1647f2db3a1b",
    dia_semana: "SEGUNDA",
    slot_horario_id: "e4ed1d03-b054-4f05-8dc8-1647f2db3a1b",
    versao_id: "e4ed1d03-b054-4f05-8dc8-1647f2db3a1b"
  });
  console.log("Error:", error);
}
test();
