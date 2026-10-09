-- ==============================================================================
-- 09_regras_temporais_modulos.sql
-- Implementação das Regras Temporais:
-- - Cursos Superiores e Subsequentes: Semestrais (1º ou 2º semestre pela versão)
-- - Integrado 2ºs e 3ºs anos: Anual (INTEGRAL - colide com tudo)
-- - Integrado 1ºs anos: 3 Módulos (Trimestres) sequenciais
--     * M1 colide com 1º Semestre e com Integrado Anual
--     * M2 colide com 1º Semestre, 2º Semestre e com Integrado Anual
--     * M3 colide com 2º Semestre e com Integrado Anual
--     * Módulos entre si NÃO colidem (M1 vs M2, M1 vs M3, M2 vs M3 = SEM CHOQUE)
-- ==============================================================================

-- 1. Garante que a coluna modulo existe em aulas com os valores permitidos
ALTER TABLE public.aulas 
ADD COLUMN IF NOT EXISTS modulo VARCHAR(20) DEFAULT 'INTEGRAL';

UPDATE public.aulas 
SET modulo = 'INTEGRAL' 
WHERE modulo IS NULL;

ALTER TABLE public.aulas 
DROP CONSTRAINT IF EXISTS aulas_modulo_check;

ALTER TABLE public.aulas 
ADD CONSTRAINT aulas_modulo_check 
CHECK (modulo IN ('INTEGRAL', 'MODULO_1', 'MODULO_2', 'MODULO_3'));

CREATE INDEX IF NOT EXISTS idx_aulas_modulo_versao 
ON public.aulas (versao_id, modulo);

CREATE INDEX IF NOT EXISTS idx_aulas_modulo_turma 
ON public.aulas (turma_id, modulo);

-- 2. Função para categorizar o tempo da aula
CREATE OR REPLACE FUNCTION public.fn_classificar_tempo_aula(
    p_modalidade text,
    p_modulo text,
    p_semestre_versao text
) RETURNS text AS $$
BEGIN
    -- Se for Integrado:
    IF p_modalidade = 'INTEGRADO' THEN
        IF p_modulo IN ('MODULO_1', 'MODULO_2', 'MODULO_3') THEN
            RETURN p_modulo;
        ELSE
            RETURN 'INTEGRAL';
        END IF;
    END IF;

    -- Se for Superior ou Subsequente (cursos semestrais):
    IF p_semestre_versao ILIKE '%.2%' OR p_semestre_versao ILIKE '%-2%' THEN
        RETURN 'SUPERIOR_SEM2';
    ELSE
        RETURN 'SUPERIOR_SEM1';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Função que avalia se dois tempos colidem
CREATE OR REPLACE FUNCTION public.fn_conflitam_tempo(
    t1 text,
    t2 text
) RETURNS boolean AS $$
BEGIN
    -- Se qualquer uma for INTEGRAL (anual), colide com todas
    IF t1 = 'INTEGRAL' OR t2 = 'INTEGRAL' THEN
        RETURN TRUE;
    END IF;

    -- Se forem da mesma categoria (M1 com M1, M2 com M2, M3 com M3, etc.)
    IF t1 = t2 THEN
        RETURN TRUE;
    END IF;

    -- Módulo 1 colide com 1º Semestre
    IF (t1 = 'MODULO_1' AND t2 = 'SUPERIOR_SEM1') OR (t1 = 'SUPERIOR_SEM1' AND t2 = 'MODULO_1') THEN
        RETURN TRUE;
    END IF;

    -- Módulo 2 colide com 1º E 2º Semestre
    IF (t1 = 'MODULO_2' AND t2 IN ('SUPERIOR_SEM1', 'SUPERIOR_SEM2')) 
       OR (t2 = 'MODULO_2' AND t1 IN ('SUPERIOR_SEM1', 'SUPERIOR_SEM2')) THEN
        RETURN TRUE;
    END IF;

    -- Módulo 3 colide com 2º Semestre
    IF (t1 = 'MODULO_3' AND t2 = 'SUPERIOR_SEM2') OR (t1 = 'SUPERIOR_SEM2' AND t2 = 'MODULO_3') THEN
        RETURN TRUE;
    END IF;

    -- Em qualquer outro par:
    -- M1 vs M2: FALSE (sequenciais)
    -- M1 vs M3: FALSE (sequenciais)
    -- M2 vs M3: FALSE (sequenciais)
    -- M1 vs SUPERIOR_SEM2: FALSE
    -- M3 vs SUPERIOR_SEM1: FALSE
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Recriação das Views de Choques Horários
DROP VIEW IF EXISTS public.vw_choques_horarios CASCADE;
DROP VIEW IF EXISTS public.vw_choques_horarios_base CASCADE;

CREATE VIEW public.vw_choques_horarios_base AS
 WITH aulas_com_tempo AS (
     SELECT 
         a.id,
         a.versao_id,
         a.turma_id,
         a.disciplina_id,
         a.professor_id,
         a.espaco_id,
         a.slot_horario_id,
         a.dia_semana,
         a.status,
         COALESCE(a.modulo, 'INTEGRAL') as modulo,
         c.modalidade,
         v.semestre as versao_semestre,
         public.fn_classificar_tempo_aula(c.modalidade::text, a.modulo::text, v.semestre::text) as tempo_categoria
     FROM public.aulas a
     JOIN public.turmas t ON a.turma_id = t.id
     JOIN public.cursos c ON t.curso_id = c.id
     JOIN public.versoes_grade v ON a.versao_id = v.id
 ),
 descansos_encontrados AS (
     SELECT a1.id AS id_aula_dia_1,
            a2.id AS id_aula_dia_2,
            a1.versao_id
       FROM aulas_com_tempo a1
       JOIN public.slots_horarios s1 ON a1.slot_horario_id = s1.id
       JOIN aulas_com_tempo a2 ON a1.professor_id = a2.professor_id 
            AND a1.versao_id = a2.versao_id 
            AND a1.id <> a2.id
            AND public.fn_conflitam_tempo(a1.tempo_categoria, a2.tempo_categoria)
       JOIN public.slots_horarios s2 ON a2.slot_horario_id = s2.id
      WHERE a1.professor_id IS NOT NULL 
        AND (((lower(a2.dia_semana)::text IN ('terca', 'terça', 'terça-feira', 'terca-feira') AND lower(a1.dia_semana)::text IN ('segunda', 'segunda-feira')) OR
              (lower(a2.dia_semana)::text IN ('quarta', 'quarta-feira') AND lower(a1.dia_semana)::text IN ('terca', 'terça', 'terça-feira', 'terca-feira')) OR
              (lower(a2.dia_semana)::text IN ('quinta', 'quinta-feira') AND lower(a1.dia_semana)::text IN ('quarta', 'quarta-feira')) OR
              (lower(a2.dia_semana)::text IN ('sexta', 'sexta-feira') AND lower(a1.dia_semana)::text IN ('quinta', 'quinta-feira')) OR
              (lower(a2.dia_semana)::text IN ('sabado', 'sábado', 'sábado-feira') AND lower(a1.dia_semana)::text IN ('sexta', 'sexta-feira')))
             AND (((s2.hora_inicio)::interval + '24:00:00'::interval) - (s1.hora_fim)::interval) < '10:00:00'::interval)
 ),
 turnos_por_dia AS (
     SELECT a.professor_id,
            a.dia_semana,
            a.versao_id,
            a.tempo_categoria
       FROM aulas_com_tempo a
       JOIN public.slots_horarios s ON a.slot_horario_id = s.id
      WHERE a.professor_id IS NOT NULL
      GROUP BY a.professor_id, a.dia_semana, a.versao_id, a.tempo_categoria
     HAVING count(DISTINCT s.turno) >= 3
 ),
 aulas_geminadas AS (
     SELECT aulas_com_tempo.versao_id,
            aulas_com_tempo.turma_id,
            aulas_com_tempo.disciplina_id,
            aulas_com_tempo.dia_semana,
            aulas_com_tempo.modulo
       FROM aulas_com_tempo
      WHERE aulas_com_tempo.turma_id IS NOT NULL AND aulas_com_tempo.disciplina_id IS NOT NULL
      GROUP BY aulas_com_tempo.versao_id, aulas_com_tempo.turma_id, aulas_com_tempo.disciplina_id, aulas_com_tempo.dia_semana, aulas_com_tempo.modulo
     HAVING count(aulas_com_tempo.id) > 2
 ),
 carga_horaria_validacao AS (
     SELECT a.versao_id,
            a.turma_id,
            a.disciplina_id,
            a.modulo,
            d.carga_horaria_semanal,
            count(a.id) AS total_lancado
       FROM aulas_com_tempo a
       JOIN public.disciplinas d ON a.disciplina_id = d.id
      WHERE a.turma_id IS NOT NULL AND a.disciplina_id IS NOT NULL
      GROUP BY a.versao_id, a.turma_id, a.disciplina_id, a.modulo, d.carga_horaria_semanal
 )
 -- 1. CHOQUE DE TURMA
 SELECT a1.id AS id_aula_foco,
    a1.versao_id,
    a2.id AS id_aula_conflito,
    'CHOQUE_TURMA'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM aulas_com_tempo a1
   JOIN aulas_com_tempo a2 ON a1.versao_id = a2.versao_id 
      AND lower(a1.dia_semana::text) = lower(a2.dia_semana::text) 
      AND a1.slot_horario_id = a2.slot_horario_id 
      AND a1.turma_id = a2.turma_id 
      AND a1.id <> a2.id
      AND public.fn_conflitam_tempo(a1.tempo_categoria, a2.tempo_categoria)
 UNION ALL
 -- 2. CHOQUE DE ESPAÇO
 SELECT a1.id AS id_aula_foco,
    a1.versao_id,
    a2.id AS id_aula_conflito,
    'CHOQUE_ESPACO'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM aulas_com_tempo a1
   JOIN aulas_com_tempo a2 ON a1.versao_id = a2.versao_id 
      AND lower(a1.dia_semana::text) = lower(a2.dia_semana::text) 
      AND a1.slot_horario_id = a2.slot_horario_id 
      AND a1.espaco_id = a2.espaco_id 
      AND a1.id <> a2.id
      AND public.fn_conflitam_tempo(a1.tempo_categoria, a2.tempo_categoria)
  WHERE a1.espaco_id IS NOT NULL
 UNION ALL
 -- 3. CHOQUE DE DOCENTE
 SELECT a1.id AS id_aula_foco,
    a1.versao_id,
    a2.id AS id_aula_conflito,
    'CHOQUE_DOCENTE'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM aulas_com_tempo a1
   JOIN aulas_com_tempo a2 ON a1.versao_id = a2.versao_id 
      AND lower(a1.dia_semana::text) = lower(a2.dia_semana::text) 
      AND a1.slot_horario_id = a2.slot_horario_id 
      AND a1.professor_id = a2.professor_id 
      AND a1.id <> a2.id
      AND public.fn_conflitam_tempo(a1.tempo_categoria, a2.tempo_categoria)
  WHERE a1.professor_id IS NOT NULL
 UNION ALL
 -- 4. DESCANSO DOCENTE
 SELECT descansos_encontrados.id_aula_dia_1 AS id_aula_foco,
    descansos_encontrados.versao_id,
    descansos_encontrados.id_aula_dia_2 AS id_aula_conflito,
    'DESCANSO_DOCENTE'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM descansos_encontrados
 UNION ALL
 SELECT descansos_encontrados.id_aula_dia_2 AS id_aula_foco,
    descansos_encontrados.versao_id,
    descansos_encontrados.id_aula_dia_1 AS id_aula_conflito,
    'DESCANSO_DOCENTE'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM descansos_encontrados
 UNION ALL
 -- 5. LIMITE DE TURNOS NO MESMO DIA
 SELECT a.id AS id_aula_foco,
    a.versao_id,
    NULL::uuid AS id_aula_conflito,
    'LIMITE_TURNOS'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM aulas_com_tempo a
   JOIN turnos_por_dia t ON a.professor_id = t.professor_id 
      AND lower(a.dia_semana::text) = lower(t.dia_semana::text) 
      AND a.versao_id = t.versao_id
      AND public.fn_conflitam_tempo(a.tempo_categoria, t.tempo_categoria)
 UNION ALL
 -- 6. INDISPONIBILIDADE DO PROFESSOR
 SELECT a.id AS id_aula_foco,
    a.versao_id,
    NULL::uuid AS id_aula_conflito,
    'INDISPONIBILIDADE'::text AS tipo_choque,
    i.motivo AS mensagem_customizada
   FROM aulas_com_tempo a
   JOIN public.professores_indisponibilidades i ON a.professor_id = i.professor_id 
      AND lower(a.dia_semana::text) = lower(i.dia_semana::text) 
      AND a.slot_horario_id = i.slot_horario_id
 UNION ALL
 -- 7. DIA DE PLANEJAMENTO DO PROFESSOR
 SELECT a.id AS id_aula_foco,
    a.versao_id,
    NULL::uuid AS id_aula_conflito,
    'DIA_PLANEJAMENTO'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM aulas_com_tempo a
   JOIN public.professores p ON a.professor_id = p.id
  WHERE p.dia_planejamento IS NOT NULL 
    AND lower(a.dia_semana::text) ~~ ('%'::text || lower(p.dia_planejamento::text) || '%'::text)
 UNION ALL
 -- 8. AULAS GEMINADAS EXCEDIDAS
 SELECT a.id AS id_aula_foco,
    a.versao_id,
    NULL::uuid AS id_aula_conflito,
    'AULAS_GEMINADAS'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM aulas_com_tempo a
   JOIN aulas_geminadas g ON a.versao_id = g.versao_id 
      AND a.turma_id = g.turma_id 
      AND a.disciplina_id = g.disciplina_id 
      AND lower(a.dia_semana::text) = lower(g.dia_semana::text)
      AND a.modulo = g.modulo
 UNION ALL
 -- 9. FIM DE SEMANA (SEXTA NOITE -> SEGUNDA MANHÃ)
 SELECT a1.id AS id_aula_foco,
    a1.versao_id,
    a2.id AS id_aula_conflito,
    'FIM_DE_SEMANA'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM aulas_com_tempo a1
   JOIN public.slots_horarios s1 ON a1.slot_horario_id = s1.id
   JOIN aulas_com_tempo a2 ON a1.professor_id = a2.professor_id 
        AND a1.versao_id = a2.versao_id 
        AND a1.id <> a2.id
        AND public.fn_conflitam_tempo(a1.tempo_categoria, a2.tempo_categoria)
   JOIN public.slots_horarios s2 ON a2.slot_horario_id = s2.id
  WHERE a1.professor_id IS NOT NULL 
    AND lower(a1.dia_semana::text) ~~ '%sexta%'::text 
    AND (lower(s1.turno::text) = ANY (ARRAY['noite'::text, 'noturno'::text])) 
    AND lower(a2.dia_semana::text) ~~ '%segunda%'::text 
    AND (lower(s2.turno::text) = ANY (ARRAY['manhã'::text, 'manha'::text, 'matutino'::text]))
 UNION ALL
 -- 10. CARGA HORÁRIA INCOMPLETA NO MÓDULO/ANO
 SELECT a.id AS id_aula_foco,
    a.versao_id,
    NULL::uuid AS id_aula_conflito,
    'CARGA_INCOMPLETA'::text AS tipo_choque,
    'Faltam aulas para completar a carga horária semanal.'::text AS mensagem_customizada
   FROM aulas_com_tempo a
   JOIN carga_horaria_validacao v ON a.versao_id = v.versao_id 
        AND a.turma_id = v.turma_id 
        AND a.disciplina_id = v.disciplina_id
        AND a.modulo = v.modulo
  WHERE v.total_lancado < v.carga_horaria_semanal
 UNION ALL
 -- 11. EXCESSO DE CARGA HORÁRIA NO MÓDULO/ANO
 SELECT a.id AS id_aula_foco,
    a.versao_id,
    NULL::uuid AS id_aula_conflito,
    'EXCESSO_CARGA'::text AS tipo_choque,
    'A carga horária semanal desta disciplina foi excedida.'::text AS mensagem_customizada
   FROM aulas_com_tempo a
   JOIN carga_horaria_validacao v ON a.versao_id = v.versao_id 
        AND a.turma_id = v.turma_id 
        AND a.disciplina_id = v.disciplina_id
        AND a.modulo = v.modulo
  WHERE v.total_lancado > v.carga_horaria_semanal;

-- Criação da view final com DISTINCT
CREATE VIEW public.vw_choques_horarios AS
 SELECT DISTINCT 
    id_aula_foco,
    versao_id,
    id_aula_conflito,
    tipo_choque,
    mensagem_customizada
   FROM public.vw_choques_horarios_base;

-- Permissões
GRANT ALL ON TABLE public.vw_choques_horarios_base TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.vw_choques_horarios TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_classificar_tempo_aula(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_conflitam_tempo(text, text) TO anon, authenticated, service_role;
