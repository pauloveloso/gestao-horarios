const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key) acc[key] = val;
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data: aulas } = await supabase.from('aulas').select('dia_semana').limit(5);
  console.log('Aulas dia_semana:', aulas);
  const { data: slots } = await supabase.from('slots_horarios').select('turno').limit(5);
  console.log('Slots turno:', slots);
}
run();
