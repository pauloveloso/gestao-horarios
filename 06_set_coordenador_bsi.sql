-- 06_set_coordenador_bsi.sql
-- Define o perfil de paulo.junior@ifnmg.edu.br como COORDENADOR
-- vinculado ao Bacharelado em Sistemas de Informação

UPDATE public.usuarios_sistema
SET
  nivel_acesso = 'COORDENADOR',
  curso_id = (
    SELECT id FROM public.cursos
    WHERE nome ILIKE '%Sistemas de Informação%'
    LIMIT 1
  )
WHERE email = 'paulo.junior@ifnmg.edu.br';

-- Verificação: exibe o resultado após a alteração
SELECT id, nome, email, nivel_acesso, curso_id
FROM public.usuarios_sistema
WHERE email = 'paulo.junior@ifnmg.edu.br';
