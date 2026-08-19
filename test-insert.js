const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase.from('aulas').select('id').limit(1);
  console.log("Select Error:", error);
  console.log("Select Data:", data);
  
  if (data && data.length > 0) {
    const { error: updErr } = await supabase.from('aulas').update({ status: 'ATIVO' }).eq('id', data[0].id);
    console.log("Update Error:", updErr);
  }
}
test();
