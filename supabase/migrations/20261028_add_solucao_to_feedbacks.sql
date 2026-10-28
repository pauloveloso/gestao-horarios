-- SGH — Adiciona campo de solução/resposta na tabela de Feedbacks
-- Descrição: Permite que administradores descrevam a solução adotada ao mudar o status do feedback

ALTER TABLE public.feedbacks 
ADD COLUMN IF NOT EXISTS solucao TEXT;

COMMENT ON COLUMN public.feedbacks.solucao IS 'Descrição da solução, providências tomadas ou justificativa do administrador';
