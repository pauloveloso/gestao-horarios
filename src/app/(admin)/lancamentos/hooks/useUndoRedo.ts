import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export type ActionType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface Action {
  type: ActionType;
  recordId?: string; // Para UPDATE/DELETE, e preenchido após o INSERT
  previousData?: any; // Objeto completo da aula para DELETE, ou valores anteriores para UPDATE
  newData?: any; // Payload para INSERT ou valores novos para UPDATE
}

export function useUndoRedo(maxHistory = 30) {
  const [past, setPast] = useState<Action[]>([]);
  const [future, setFuture] = useState<Action[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const executeAction = async (action: Action) => {
    setIsProcessing(true);
    let finalAction = { ...action };
    
    try {
      if (action.type === 'INSERT') {
        const { data, error } = await supabase.from('aulas').insert(action.newData).select().single();
        if (error) throw error;
        finalAction.recordId = data.id;
        finalAction.newData = data; 
      } else if (action.type === 'UPDATE') {
        const { error } = await supabase.from('aulas').update(action.newData).eq('id', action.recordId);
        if (error) throw error;
      } else if (action.type === 'DELETE') {
        const { error } = await supabase.from('aulas').delete().eq('id', action.recordId);
        if (error) throw error;
      }

      setPast((prev) => {
        const newPast = [...prev, finalAction];
        if (newPast.length > maxHistory) {
          return newPast.slice(newPast.length - maxHistory);
        }
        return newPast;
      });
      setFuture([]); // Limpa o futuro ao fazer uma nova ação
      return { success: true, data: finalAction.newData };
    } catch (error) {
      console.error("Erro ao executar ação:", error);
      return { success: false, error };
    } finally {
      setIsProcessing(false);
    }
  };

  const undo = async () => {
    if (past.length === 0 || isProcessing) return;
    setIsProcessing(true);
    
    const actionToUndo = past[past.length - 1];
    
    try {
      if (actionToUndo.type === 'INSERT') {
        // O reverso de INSERT é DELETE
        const { error } = await supabase.from('aulas').delete().eq('id', actionToUndo.recordId);
        if (error) throw error;
      } else if (actionToUndo.type === 'UPDATE') {
        // O reverso de UPDATE é UPDATE com os dados anteriores
        const { error } = await supabase.from('aulas').update(actionToUndo.previousData).eq('id', actionToUndo.recordId);
        if (error) throw error;
      } else if (actionToUndo.type === 'DELETE') {
        // O reverso de DELETE é INSERT com os dados anteriores (mantendo o ID)
        const { error } = await supabase.from('aulas').insert(actionToUndo.previousData);
        if (error) throw error;
      }

      setPast((prev) => prev.slice(0, prev.length - 1));
      setFuture((prev) => [actionToUndo, ...prev]);
    } catch (error) {
      console.error("Erro ao desfazer ação:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const redo = async () => {
    if (future.length === 0 || isProcessing) return;
    setIsProcessing(true);
    
    const actionToRedo = future[0];
    
    try {
      if (actionToRedo.type === 'INSERT') {
        // Refazer INSERT (re-insere)
        const { error } = await supabase.from('aulas').insert(actionToRedo.newData);
        if (error) throw error;
      } else if (actionToRedo.type === 'UPDATE') {
        // Refazer UPDATE (atualiza com newData)
        const { error } = await supabase.from('aulas').update(actionToRedo.newData).eq('id', actionToRedo.recordId);
        if (error) throw error;
      } else if (actionToRedo.type === 'DELETE') {
        // Refazer DELETE (deleta novamente)
        const { error } = await supabase.from('aulas').delete().eq('id', actionToRedo.recordId);
        if (error) throw error;
      }

      setFuture((prev) => prev.slice(1));
      setPast((prev) => [...prev, actionToRedo]);
    } catch (error) {
      console.error("Erro ao refazer ação:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    past,
    future,
    executeAction,
    undo,
    redo,
    canUndo: past.length > 0 && !isProcessing,
    canRedo: future.length > 0 && !isProcessing,
    isProcessing
  };
}
