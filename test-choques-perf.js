const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key) acc[key.trim()] = val.trim();
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  console.time('fetchChoques');
  const { data, error } = await supabase.from('vw_choques_horarios').select('*');
  console.timeEnd('fetchChoques');
  console.log(`Retornou ${data ? data.length : 0} choques. Erro:`, error);
  
  console.time('fetchAulas');
  const { data: aulas } = await supabase.from('aulas').select('*');
  console.timeEnd('fetchAulas');
  console.log(`Retornou ${aulas ? aulas.length : 0} aulas.`);
}
run();
