-- ================================================================
-- 07_usuarios_delete_policy.sql
-- Permite que Administradores excluam registros de usuarios_sistema
-- ================================================================

-- Cria a política para deleção caso ela ainda não exista
DROP POLICY IF EXISTS "Permitir delete por administradores" ON public.usuarios_sistema;

CREATE POLICY "Permitir delete por administradores" ON public.usuarios_sistema 
FOR DELETE USING (
  (SELECT nivel_acesso FROM public.usuarios_sistema WHERE id = auth.uid()) = 'ADMINISTRADOR'::public.nivel_acesso_enum
);
