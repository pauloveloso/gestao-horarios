const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function test() {
  const req = await fetch(`${url}/rest/v1/aulas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      turma_id: "test",
      disciplina_id: "test",
      dia_semana: "SEGUNDA",
      slot_horario_id: "test",
      versao_id: "test"
    })
  });
  const res = await req.json();
  console.log("Status:", req.status);
  console.log("Response:", res);
}
test();
