const { supabase } = require('./src/lib/supabase');
console.log("Supabase type:", typeof supabase);
console.log("Has from:", typeof supabase?.from);
