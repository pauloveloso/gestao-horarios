-- 05_fix_nomes_usuarios.sql
-- Corrige os nomes dos usuários já cadastrados removendo o nick do email
-- que o Google Workspace cola ao final do full_name.
-- Ex: "Paulo Veloso Santos Junior paulo.junior" => "Paulo Veloso Santos Junior"

UPDATE public.usuarios_sistema
SET nome = TRIM(REGEXP_REPLACE(nome, '\s+[a-z0-9]+\.[a-z0-9]+\s*$', '', 'i'))
WHERE nome ~ '\s+[a-z0-9]+\.[a-z0-9]+\s*$';

-- Atualiza também a trigger de criação de novos usuários para já gravar o nome limpo

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  nome_completo text;
BEGIN
  -- Pega o full_name ou name do metadata do Google
  nome_completo := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Remove o nick do email caso venha colado ao final (ex: "Paulo Junior paulo.junior")
  nome_completo := TRIM(REGEXP_REPLACE(nome_completo, '\s+[a-z0-9]+\.[a-z0-9]+\s*$', '', 'i'));

  INSERT INTO public.usuarios_sistema (id, email, nome)
  VALUES (new.id, new.email, nome_completo);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
