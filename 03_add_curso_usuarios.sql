-- 03_add_curso_usuarios.sql
-- Adiciona vínculo de curso para os coordenadores

ALTER TABLE public.usuarios_sistema 
ADD COLUMN curso_id uuid REFERENCES public.cursos(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.usuarios_sistema.curso_id IS 'Vincula um coordenador ou vice a um curso específico';
