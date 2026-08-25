-- ==========================================
-- SCRIPT DE CONFIGURAÇÃO DO RBAC (Níveis de Acesso)
-- Rode este script no painel SQL do Supabase
-- ==========================================

-- 1. Criar enum de níveis de acesso
CREATE TYPE public.nivel_acesso_enum AS ENUM (
  'PROFESSOR_TAE',
  'COORDENADOR',
  'COMISSAO',
  'DIRECAO',
  'ADMINISTRADOR'
);

-- 2. Criar tabela usuarios_sistema (vinculada ao auth.users)
CREATE TABLE public.usuarios_sistema (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome character varying(255),
  email character varying(255) NOT NULL,
  nivel_acesso public.nivel_acesso_enum DEFAULT 'PROFESSOR_TAE'::public.nivel_acesso_enum NOT NULL,
  criado_em timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Adicionar coluna criado_por na tabela de reservas_espacos
ALTER TABLE public.reservas_espacos 
ADD COLUMN criado_por uuid REFERENCES public.usuarios_sistema(id) ON DELETE SET NULL;

-- 4. Função e Trigger para popular usuarios_sistema automaticamente no 1º login
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios_sistema (id, email, nome)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- OBS: Se a trigger já existir de algum teste passado, comente a linha CREATE TRIGGER abaixo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 5. SEGURANÇA BÁSICA (RLS)
-- ==========================================
ALTER TABLE public.usuarios_sistema ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários do sistema
-- Permitir que qualquer um leia os usuários (necessário para o painel de admins e ver nomes)
CREATE POLICY "Permitir leitura de usuarios_sistema" ON public.usuarios_sistema FOR SELECT USING (true);

-- Permitir update apenas por administradores
CREATE POLICY "Permitir update por administradores" ON public.usuarios_sistema FOR UPDATE USING (
  (SELECT nivel_acesso FROM public.usuarios_sistema WHERE id = auth.uid()) = 'ADMINISTRADOR'::public.nivel_acesso_enum
);
