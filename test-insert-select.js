const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);
const crypto = require('crypto');

async function test() {
  const { data: v } = await supabase.from('versoes_grade').select('id').limit(1);
  const { data: t } = await supabase.from('turmas').select('id').limit(1);
  const { data: d } = await supabase.from('disciplinas').select('id').limit(1);
  const { data: s } = await supabase.from('slots_horarios').select('id').limit(1);
  
  const id = crypto.randomUUID();
  console.log("Inserting...", id);
  await supabase.from('aulas').insert({
    id: id,
    turma_id: t[0].id,
    disciplina_id: d[0].id,
    dia_semana: "SEGUNDA",
    slot_horario_id: s[0].id,
    versao_id: v[0].id
  });
  
  console.log("Selecting immediately...");
  const { data: aulas } = await supabase.from('aulas').select('id').eq('id', id);
  console.log("Found:", aulas.length > 0 ? "YES" : "NO");
}
test();
