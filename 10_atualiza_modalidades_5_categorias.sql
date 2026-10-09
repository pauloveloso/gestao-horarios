-- ==============================================================================
-- 10_atualiza_modalidades_5_categorias.sql
-- Atualiza as categorias de modalidades de curso para as 5 categorias oficiais:
-- 1 - FIC (Formação Inicial e Continuada)
-- 2 - INTEGRADO (Ensino Técnico Integrado ao Ensino Médio - único anual/modular)
-- 3 - SUBSEQUENTE_CONCOMITANTE (Ensino Técnico Subsequente e/ou Concomitante ao Ensino Médio)
-- 4 - SUPERIOR (Ensino Superior)
-- 5 - POS_GRADUACAO (Pós-Graduação)
-- ==============================================================================

-- 1. Adiciona o novo valor ao tipo enum se não existir
ALTER TYPE public.modalidade_curso ADD VALUE IF NOT EXISTS 'SUBSEQUENTE_CONCOMITANTE';

-- 2. Atualiza os cursos existentes
UPDATE public.cursos 
SET modalidade = 'SUBSEQUENTE_CONCOMITANTE' 
WHERE modalidade IN ('SUBSEQUENTE', 'CONCOMITANTE');
