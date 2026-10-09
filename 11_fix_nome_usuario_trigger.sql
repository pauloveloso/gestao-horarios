-- ==========================================
-- SCRIPT: Corrigir nome de usuário no cadastro automático
-- Remove o sufixo de usuário Google (ex: "paulo.junior") ao final do full_name
-- Data: 09/10/2026
-- ==========================================

-- 1. Atualiza a função de trigger para limpar o sufixo antes de inserir
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_nome_bruto text;
  v_nome_limpo text;
BEGIN
  -- Obtém o nome bruto do Google / provedor OAuth
  v_nome_bruto := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Remove sufixo no padrao "palavra.palavra" colado ao final pelo Google Workspace
  -- Ex: "Paulo Veloso Santos Junior paulo.junior" => "Paulo Veloso Santos Junior"
  v_nome_limpo := TRIM(
    REGEXP_REPLACE(v_nome_bruto, '\s+[a-zA-Z0-9]+\.[a-zA-Z0-9]+\s*$', '')
  );

  -- Garante que nao ficou vazio apos a limpeza
  IF v_nome_limpo IS NULL OR TRIM(v_nome_limpo) = '' THEN
    v_nome_limpo := v_nome_bruto;
  END IF;

  INSERT INTO public.usuarios_sistema (id, email, nome)
  VALUES (new.id, new.email, v_nome_limpo)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recria a trigger (garante que esta ativa com a nova funcao)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 3. Corrige os nomes ja cadastrados que possuem o sufixo Google
-- ==========================================
UPDATE public.usuarios_sistema
SET nome = TRIM(REGEXP_REPLACE(nome, '\s+[a-zA-Z0-9]+\.[a-zA-Z0-9]+\s*$', ''))
WHERE nome ~ '\s+[a-zA-Z0-9]+\.[a-zA-Z0-9]+\s*$';

-- Para conferir antes de rodar o UPDATE acima, execute:
-- SELECT id, email, nome FROM public.usuarios_sistema WHERE nome ~ '\s+[a-zA-Z0-9]+\.[a-zA-Z0-9]+\s*$';
