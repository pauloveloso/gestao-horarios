import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: aulas } = await supabase.from('aulas').select('dia_semana').limit(5);
  console.log('Aulas dia_semana:', aulas);
  const { data: slots } = await supabase.from('slots_horarios').select('turno').limit(5);
  console.log('Slots turno:', slots);
}
run();
