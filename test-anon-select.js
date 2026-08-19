const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function test() {
  const req = await fetch(`${url}/rest/v1/aulas?limit=1`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const res = await req.json();
  console.log("Status:", req.status);
  console.log("Response length:", res.length);
}
test();
