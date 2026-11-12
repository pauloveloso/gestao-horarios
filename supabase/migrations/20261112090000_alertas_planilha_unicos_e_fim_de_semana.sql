-- Mantém a view e suas colunas compatíveis com a aplicação atual.
-- A aula de segunda-feira também recebe o aviso sexta à noite + segunda de manhã.
CREATE OR REPLACE VIEW public.vw_choques_horarios AS
SELECT DISTINCT
  id_aula_foco,
  versao_id,
  id_aula_conflito,
  tipo_choque,
  mensagem_customizada
FROM public.vw_choques_horarios_base

UNION

SELECT
  id_aula_conflito AS id_aula_foco,
  versao_id,
  id_aula_foco AS id_aula_conflito,
  tipo_choque,
  mensagem_customizada
FROM public.vw_choques_horarios_base
WHERE tipo_choque = 'FIM_DE_SEMANA'
  AND id_aula_conflito IS NOT NULL;
