-- ============================================================================
-- SGH — Tabela de Feedbacks
-- Criação: 2026-10-23
-- Descrição: Armazena feedbacks enviados pelos usuários do sistema (problemas,
--            sugestões, melhorias). O campo imagem_url referencia o Storage
--            do Supabase (bucket: feedback-imagens).
-- ============================================================================

-- 1. Tipos (ENUM)
DO $$
BEGIN
  -- Tipo de feedback
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_feedback') THEN
    CREATE TYPE tipo_feedback AS ENUM ('BUG', 'SUGESTAO', 'MELHORIA', 'OUTRO');
  END IF;

  -- Status de tratamento
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_feedback') THEN
    CREATE TYPE status_feedback AS ENUM ('ABERTO', 'EM_ANALISE', 'RESOLVIDO', 'DESCARTADO');
  END IF;
END $$;


-- 2. Tabela principal
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo         tipo_feedback    NOT NULL DEFAULT 'BUG',
  titulo       TEXT,
  descricao    TEXT             NOT NULL,
  imagem_url   TEXT,                          -- URL pública do Storage (opcional)

  -- Dados do usuário no momento do envio (desnormalizado para histórico)
  usuario_id    UUID            REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome  TEXT,
  usuario_email TEXT,
  nivel_acesso  TEXT,                         -- cópia do nivel_acesso no momento do envio

  status        status_feedback NOT NULL DEFAULT 'ABERTO',

  criado_em     TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_feedbacks_status    ON public.feedbacks (status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_tipo      ON public.feedbacks (tipo);
CREATE INDEX IF NOT EXISTS idx_feedbacks_usuario   ON public.feedbacks (usuario_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_criado_em ON public.feedbacks (criado_em DESC);


-- 4. RLS (Row Level Security)
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode INSERIR seus próprios feedbacks
CREATE POLICY "feedback_insert_autenticado"
  ON public.feedbacks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id OR usuario_id IS NULL);

-- Apenas a service_role (admin) pode LER todos os feedbacks
-- (Ajuste conforme necessário — ex: liberar para ADMINISTRADOR via função)
CREATE POLICY "feedback_select_service_role"
  ON public.feedbacks
  FOR SELECT
  TO service_role
  USING (true);

-- Usuário pode ler seus próprios feedbacks
CREATE POLICY "feedback_select_proprio"
  ON public.feedbacks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

-- service_role pode ATUALIZAR status dos feedbacks (painel admin)
CREATE POLICY "feedback_update_service_role"
  ON public.feedbacks
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados com nivel_acesso ADMINISTRADOR podem atualizar status
-- (via política baseada em função — opcional, use se não quiser depender de service_role)
-- CREATE POLICY "feedback_update_admin"
--   ON public.feedbacks
--   FOR UPDATE
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM usuarios_sistema
--       WHERE id = auth.uid() AND nivel_acesso = 'ADMINISTRADOR'
--     )
--   );

-- ============================================================================
-- BUCKET DE STORAGE (execute no painel do Supabase ou via CLI)
-- ============================================================================
-- Nome do bucket : feedback-imagens
-- Público        : SIM (para URLs públicas funcionarem)
-- Tamanho máximo : 5 MB
-- Tipos permitidos: image/png, image/jpeg, image/gif, image/webp
--
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'feedback-imagens',
--   'feedback-imagens',
--   true,
--   5242880,
--   ARRAY['image/png','image/jpeg','image/gif','image/webp']
-- )
-- ON CONFLICT (id) DO NOTHING;
--
-- Policy de upload:
-- CREATE POLICY "feedback_storage_upload"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'feedback-imagens');
