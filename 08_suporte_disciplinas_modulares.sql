-- ==============================================================================
-- 08_suporte_disciplinas_modulares.sql
-- Adiciona suporte a disciplinas modulares (1º, 2º e 3º Trimestres / Módulos)
-- com verificação de choques temporais (Turmas, Professores e Espaços).
-- ==============================================================================

-- 1. ADICIONA A COLUNA 'modulo' NA TABELA AULAS SE NÃO EXISTIR
ALTER TABLE public.aulas 
ADD COLUMN IF NOT EXISTS modulo VARCHAR(20) DEFAULT 'INTEGRAL';

-- 2. ATUALIZA AULAS EXISTENTES PARA O VALOR PADRÃO
UPDATE public.aulas 
SET modulo = 'INTEGRAL' 
WHERE modulo IS NULL;

-- 3. CRIA RESTRIÇÃO DE VALORES VÁLIDOS PARA O MÓDULO
ALTER TABLE public.aulas 
DROP CONSTRAINT IF EXISTS aulas_modulo_check;

ALTER TABLE public.aulas 
ADD CONSTRAINT aulas_modulo_check 
CHECK (modulo IN ('INTEGRAL', 'MODULO_1', 'MODULO_2', 'MODULO_3'));

-- 4. CRIA ÍNDICE PARA OTIMIZAR BUSCAS POR MÓDULO E VERSÃO
CREATE INDEX IF NOT EXISTS idx_aulas_modulo_versao 
ON public.aulas (versao_id, modulo);

CREATE INDEX IF NOT EXISTS idx_aulas_modulo_turma 
ON public.aulas (turma_id, modulo);

-- ==============================================================================
-- 5. ATUALIZAÇÃO DA VIEW DE CHOQUES COM SUPORTE A MÓDULOS
-- ==============================================================================

DROP VIEW IF EXISTS public.vw_choques_horarios CASCADE;
DROP VIEW IF EXISTS public.vw_choques_horarios_base CASCADE;

CREATE VIEW public.vw_choques_horarios_base AS
 WITH modulos_ativos AS (
         SELECT unnest(ARRAY['MODULO_1'::text, 'MODULO_2'::text, 'MODULO_3'::text]) AS mod_ativo
 ),
 descansos_encontrados AS (
         SELECT a1.id AS id_aula_dia_1,
            a2.id AS id_aula_dia_2,
            a1.versao_id
           FROM (((public.aulas a1
             JOIN public.slots_horarios s1 ON ((a1.slot_horario_id = s1.id)))
             JOIN public.aulas a2 ON (((a1.professor_id = a2.professor_id) 
                AND (a1.versao_id = a2.versao_id) 
                AND (a1.id <> a2.id)
                AND (COALESCE(a1.modulo, 'INTEGRAL') = COALESCE(a2.modulo, 'INTEGRAL') 
                     OR COALESCE(a1.modulo, 'INTEGRAL') = 'INTEGRAL' 
                     OR COALESCE(a2.modulo, 'INTEGRAL') = 'INTEGRAL')
             )))
             JOIN public.slots_horarios s2 ON ((a2.slot_horario_id = s2.id)))
          WHERE ((a1.professor_id IS NOT NULL) AND (
                CASE lower((a2.dia_semana)::text)
                    WHEN 'segunda'::text THEN 1
                    WHEN 'segunda-feira'::text THEN 1
                    WHEN 'terça'::text THEN 2
                    WHEN 'terça-feira'::text THEN 2
                    WHEN 'terca'::text THEN 2
                    WHEN 'terca-feira'::text THEN 2
                    WHEN 'quarta'::text THEN 3
                    WHEN 'quarta-feira'::text THEN 3
                    WHEN 'quinta'::text THEN 4
                    WHEN 'quinta-feira'::text THEN 4
                    WHEN 'sexta'::text THEN 5
                    WHEN 'sexta-feira'::text THEN 5
                    WHEN 'sábado'::text THEN 6
                    WHEN 'sabado'::text THEN 6
                    WHEN 'domingo'::text THEN 7
                    ELSE 0
                END = ((
                CASE lower((a1.dia_semana)::text)
                    WHEN 'segunda'::text THEN 1
                    WHEN 'segunda-feira'::text THEN 1
                    WHEN 'terça'::text THEN 2
                    WHEN 'terça-feira'::text THEN 2
                    WHEN 'terca'::text THEN 2
                    WHEN 'terca-feira'::text THEN 2
                    WHEN 'quarta'::text THEN 3
                    WHEN 'quarta-feira'::text THEN 3
                    WHEN 'quinta'::text THEN 4
                    WHEN 'quinta-feira'::text THEN 4
                    WHEN 'sexta'::text THEN 5
                    WHEN 'sexta-feira'::text THEN 5
                    WHEN 'sábado'::text THEN 6
                    WHEN 'sabado'::text THEN 6
                    WHEN 'domingo'::text THEN 7
                    ELSE 0
                END % 7) + 1)) AND ((((s2.hora_inicio)::interval + '24:00:00'::interval) - (s1.hora_fim)::interval) < '10:00:00'::interval))
        ), aulas_expandidas AS (
         SELECT a.id,
            a.versao_id,
            a.professor_id,
            a.dia_semana,
            s.turno,
            m.mod_ativo
           FROM ((public.aulas a
             JOIN public.slots_horarios s ON ((a.slot_horario_id = s.id)))
             CROSS JOIN modulos_ativos m)
          WHERE ((a.professor_id IS NOT NULL) 
            AND (COALESCE(a.modulo, 'INTEGRAL') = 'INTEGRAL' OR (a.modulo)::text = m.mod_ativo))
        ), turnos_por_dia AS (
         SELECT professor_id,
            dia_semana,
            versao_id,
            mod_ativo
           FROM aulas_expandidas
          GROUP BY professor_id, dia_semana, versao_id, mod_ativo
         HAVING (count(DISTINCT turno) >= 3)
        ), aulas_geminadas AS (
         SELECT aulas.versao_id,
            aulas.turma_id,
            aulas.disciplina_id,
            aulas.dia_semana,
            COALESCE(aulas.modulo, 'INTEGRAL') AS modulo
           FROM public.aulas
          WHERE ((aulas.turma_id IS NOT NULL) AND (aulas.disciplina_id IS NOT NULL))
          GROUP BY aulas.versao_id, aulas.turma_id, aulas.disciplina_id, aulas.dia_semana, COALESCE(aulas.modulo, 'INTEGRAL')
         HAVING (count(aulas.id) > 2)
        ), carga_horaria_validacao AS (
         SELECT a.versao_id,
            a.turma_id,
            a.disciplina_id,
            COALESCE(a.modulo, 'INTEGRAL') AS modulo,
            d.carga_horaria_semanal,
            count(a.id) AS total_lancado
           FROM (public.aulas a
             JOIN public.disciplinas d ON ((a.disciplina_id = d.id)))
          WHERE ((a.turma_id IS NOT NULL) AND (a.disciplina_id IS NOT NULL))
          GROUP BY a.versao_id, a.turma_id, a.disciplina_id, COALESCE(a.modulo, 'INTEGRAL'), d.carga_horaria_semanal
        )
 -- 1. CHOQUE DE TURMA (mesmo horário e colisão de módulos)
 SELECT a1.id AS id_aula_foco,
    a1.versao_id,
    a2.id AS id_aula_conflito,
    'CHOQUE_TURMA'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM (public.aulas a1
     JOIN public.aulas a2 ON (((a1.versao_id = a2.versao_id) 
        AND (lower((a1.dia_semana)::text) = lower((a2.dia_semana)::text)) 
        AND (a1.slot_horario_id = a2.slot_horario_id) 
        AND (a1.turma_id = a2.turma_id) 
        AND (a1.id <> a2.id)
        AND (COALESCE(a1.modulo, 'INTEGRAL') = COALESCE(a2.modulo, 'INTEGRAL') 
             OR COALESCE(a1.modulo, 'INTEGRAL') = 'INTEGRAL' 
             OR COALESCE(a2.modulo, 'INTEGRAL') = 'INTEGRAL')
     )))
 UNION ALL
 -- 2. CHOQUE DE ESPAÇO / SALA / LABORATÓRIO
 SELECT a1.id AS id_aula_foco,
    a1.versao_id,
    a2.id AS id_aula_conflito,
    'CHOQUE_ESPACO'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM (public.aulas a1
     JOIN public.aulas a2 ON (((a1.versao_id = a2.versao_id) 
        AND (lower((a1.dia_semana)::text) = lower((a2.dia_semana)::text)) 
        AND (a1.slot_horario_id = a2.slot_horario_id) 
        AND (a1.espaco_id = a2.espaco_id) 
        AND (a1.id <> a2.id)
        AND (COALESCE(a1.modulo, 'INTEGRAL') = COALESCE(a2.modulo, 'INTEGRAL') 
             OR COALESCE(a1.modulo, 'INTEGRAL') = 'INTEGRAL' 
             OR COALESCE(a2.modulo, 'INTEGRAL') = 'INTEGRAL')
     )))
  WHERE (a1.espaco_id IS NOT NULL)
 UNION ALL
 -- 3. CHOQUE DE DOCENTE / PROFESSOR
 SELECT a1.id AS id_aula_foco,
    a1.versao_id,
    a2.id AS id_aula_conflito,
    'CHOQUE_DOCENTE'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM (public.aulas a1
     JOIN public.aulas a2 ON (((a1.versao_id = a2.versao_id) 
        AND (lower((a1.dia_semana)::text) = lower((a2.dia_semana)::text)) 
        AND (a1.slot_horario_id = a2.slot_horario_id) 
        AND (a1.professor_id = a2.professor_id) 
        AND (a1.id <> a2.id)
        AND (COALESCE(a1.modulo, 'INTEGRAL') = COALESCE(a2.modulo, 'INTEGRAL') 
             OR COALESCE(a1.modulo, 'INTEGRAL') = 'INTEGRAL' 
             OR COALESCE(a2.modulo, 'INTEGRAL') = 'INTEGRAL')
     )))
  WHERE (a1.professor_id IS NOT NULL)
 UNION ALL
 -- 4. DESCANSO DOCENTE (AULA 1 -> AULA 2)
 SELECT descansos_encontrados.id_aula_dia_1 AS id_aula_foco,
    descansos_encontrados.versao_id,
    descansos_encontrados.id_aula_dia_2 AS id_aula_conflito,
    'DESCANSO_DOCENTE'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM descansos_encontrados
 UNION ALL
 -- 5. DESCANSO DOCENTE (AULA 2 -> AULA 1)
 SELECT descansos_encontrados.id_aula_dia_2 AS id_aula_foco,
    descansos_encontrados.versao_id,
    descansos_encontrados.id_aula_dia_1 AS id_aula_conflito,
    'DESCANSO_DOCENTE'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM descansos_encontrados
 UNION ALL
 -- 6. LIMITE DE TURNOS NO DIA (CONSIDERANDO MÓDULO ATIVO)
 SELECT a.id AS id_aula_foco,
    a.versao_id,
    NULL::uuid AS id_aula_conflito,
    'LIMITE_TURNOS'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM (public.aulas a
     JOIN turnos_por_dia t ON (((a.professor_id = t.professor_id) 
        AND (lower((a.dia_semana)::text) = lower((t.dia_semana)::text)) 
        AND (a.versao_id = t.versao_id)
        AND (COALESCE(a.modulo, 'INTEGRAL') = 'INTEGRAL' OR (a.modulo)::text = t.mod_ativo)
     )))
 UNION ALL
 -- 7. INDISPONIBILIDADE DO PROFESSOR
 SELECT a.id AS id_aula_foco,
    a.versao_id,
    NULL::uuid AS id_aula_conflito,
    'INDISPONIBILIDADE'::text AS tipo_choque,
    i.motivo AS mensagem_customizada
   FROM (public.aulas a
     JOIN public.professores_indisponibilidades i ON (((a.professor_id = i.professor_id) 
        AND (lower((a.dia_semana)::text) = lower((i.dia_semana)::text)) 
        AND (a.slot_horario_id = i.slot_horario_id))))
 UNION ALL
 -- 8. DIA DE PLANEJAMENTO DO PROFESSOR
 SELECT a.id AS id_aula_foco,
    a.versao_id,
    NULL::uuid AS id_aula_conflito,
    'DIA_PLANEJAMENTO'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM (public.aulas a
     JOIN public.professores p ON ((a.professor_id = p.id)))
  WHERE ((p.dia_planejamento IS NOT NULL) AND (lower((a.dia_semana)::text) ~~ (('%'::text || lower(p.dia_planejamento)) || '%'::text)))
 UNION ALL
 -- 9. AULAS GEMINADAS EXCEDIDAS
 SELECT a.id AS id_aula_foco,
    a.versao_id,
    NULL::uuid AS id_aula_conflito,
    'AULAS_GEMINADAS'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM (public.aulas a
     JOIN aulas_geminadas g ON (((a.versao_id = g.versao_id) 
        AND (a.turma_id = g.turma_id) 
        AND (a.disciplina_id = g.disciplina_id) 
        AND (lower((a.dia_semana)::text) = lower((g.dia_semana)::text))
        AND (COALESCE(a.modulo, 'INTEGRAL') = g.modulo)
     )))
 UNION ALL
 -- 10. FIM DE SEMANA (SEXTA NOITE -> SEGUNDA MANHÃ)
 SELECT a1.id AS id_aula_foco,
    a1.versao_id,
    a2.id AS id_aula_conflito,
    'FIM_DE_SEMANA'::text AS tipo_choque,
    NULL::text AS mensagem_customizada
   FROM (((public.aulas a1
     JOIN public.slots_horarios s1 ON ((a1.slot_horario_id = s1.id)))
     JOIN public.aulas a2 ON (((a1.professor_id = a2.professor_id) 
        AND (a1.versao_id = a2.versao_id) 
        AND (a1.id <> a2.id)
        AND (COALESCE(a1.modulo, 'INTEGRAL') = COALESCE(a2.modulo, 'INTEGRAL') 
             OR COALESCE(a1.modulo, 'INTEGRAL') = 'INTEGRAL' 
             OR COALESCE(a2.modulo, 'INTEGRAL') = 'INTEGRAL')
     )))
     JOIN public.slots_horarios s2 ON ((a2.slot_horario_id = s2.id)))
  WHERE ((a1.professor_id IS NOT NULL) 
    AND (lower((a1.dia_semana)::text) ~~ '%sexta%'::text) 
    AND (lower((s1.turno)::text) = ANY (ARRAY['noite'::text, 'noturno'::text])) 
    AND (lower((a2.dia_semana)::text) ~~ '%segunda%'::text) 
    AND (lower((s2.turno)::text) = ANY (ARRAY['manhã'::text, 'manha'::text, 'matutino'::text]))))
 UNION ALL
 -- 11. CARGA HORÁRIA INCOMPLETA NO MÓDULO
 SELECT a.id AS id_aula_foco,
    a.versao_id,
    NULL::uuid AS id_aula_conflito,
    'CARGA_INCOMPLETA'::text AS tipo_choque,
    'Faltam aulas para completar a carga horária semanal deste módulo.'::text AS mensagem_customizada
   FROM (public.aulas a
     JOIN carga_horaria_validacao v ON (((a.versao_id = v.versao_id) 
        AND (a.turma_id = v.turma_id) 
        AND (a.disciplina_id = v.disciplina_id)
        AND (COALESCE(a.modulo, 'INTEGRAL') = v.modulo)
     )))
  WHERE (v.total_lancado < v.carga_horaria_semanal)
 UNION ALL
 -- 12. EXCESSO DE CARGA HORÁRIA NO MÓDULO
 SELECT a.id AS id_aula_foco,
    a.versao_id,
    NULL::uuid AS id_aula_conflito,
    'EXCESSO_CARGA'::text AS tipo_choque,
    'A carga horária semanal desta disciplina foi excedida neste módulo.'::text AS mensagem_customizada
   FROM (public.aulas a
     JOIN carga_horaria_validacao v ON (((a.versao_id = v.versao_id) 
        AND (a.turma_id = v.turma_id) 
        AND (a.disciplina_id = v.disciplina_id)
        AND (COALESCE(a.modulo, 'INTEGRAL') = v.modulo)
     )))
  WHERE (v.total_lancado > v.carga_horaria_semanal);

ALTER VIEW public.vw_choques_horarios_base OWNER TO postgres;

-- 6. CRIAÇÃO DA VIEW FINAL DE CHOQUES
CREATE VIEW public.vw_choques_horarios AS
 SELECT DISTINCT 
    id_aula_foco,
    versao_id,
    id_aula_conflito,
    tipo_choque,
    mensagem_customizada
   FROM public.vw_choques_horarios_base;

ALTER VIEW public.vw_choques_horarios OWNER TO postgres;

-- 7. CONCEDE PERMISSÕES NECESSÁRIAS
GRANT ALL ON TABLE public.vw_choques_horarios_base TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.vw_choques_horarios TO anon, authenticated, service_role;
