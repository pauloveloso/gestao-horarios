// src/types/index.ts
export interface Professor {
  id: string;
  nome: string;
}
export interface Sala {
  id: string;
  nome: string;
}
export interface Turma {
  id: string;
  codigo: string;
  curso?: string;
}
export interface Disciplina {
  id: string;
  nome: string;
}

export interface SlotHorario {
  id: string;
  rotulo: string; // "07:30 - 08:20"
  inicio: string;
  ordem: number;
  periodo: string;
}

export interface Aula {
  id: string;
  dia_semana: string;
  professor: Professor;
  sala: Sala;
  turma: Turma;
  disciplina: Disciplina;
  horario_id: string;
}
