const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function test() {
  const req = await fetch(`${url}/rest/v1/aulas?limit=1`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  console.log("Headers:", req.headers.get('cache-control'));
}
test();
