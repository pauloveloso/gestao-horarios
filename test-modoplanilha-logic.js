const turmas = [{ id: "t1", curso_id: "c1", codigo: "T1" }];
const cursos = [{ id: "c1", nome: "C1", modalidade: "INTEGRADO" }];
const slots = [{ id: "s1", hora_inicio: "08:00", hora_fim: "09:00" }];
const aulas = [
  { id: "a1", turma_id: "t1", dia_semana: "SEGUNDA", slot_horario_id: "s1" } // This is the new row
];

const getCategoriaCurso = (curso) => curso.modalidade || "SEM MODALIDADE";
const categoriaFiltro = "INTEGRADO";

const novasLinhas = [];
const cursosDaCategoria = cursos.filter((c) => getCategoriaCurso(c) === categoriaFiltro);

cursosDaCategoria.forEach((curso) => {
  const turmasDesteCurso = turmas.filter((t) => String(t.curso_id) === String(curso.id));
  turmasDesteCurso.forEach((turma) => {
    const aulasDestaTurma = aulas.filter((a) => String(a.turma_id) === String(turma.id));
    if (aulasDestaTurma.length > 0) {
      novasLinhas.push(...aulasDestaTurma);
      novasLinhas.push({ empty: true });
    }
  });
});

console.log("Novas Linhas:", novasLinhas);
