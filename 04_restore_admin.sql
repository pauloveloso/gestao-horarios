-- 04_restore_admin.sql
-- Restaura o perfil de administrador para o usuário especificado
UPDATE public.usuarios_sistema
SET nivel_acesso = 'ADMINISTRADOR'
WHERE email = 'paulo.junior@ifnmg.edu.br';
