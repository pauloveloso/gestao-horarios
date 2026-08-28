-- Script para adicionar as novas modalidades de curso (FIC e EAD)
-- Executar no banco de dados para permitir o uso dessas modalidades.

ALTER TYPE public.modalidade_curso ADD VALUE IF NOT EXISTS 'FIC';
ALTER TYPE public.modalidade_curso ADD VALUE IF NOT EXISTS 'EAD';
