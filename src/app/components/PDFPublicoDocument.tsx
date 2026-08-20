import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  section: {
    marginBottom: 15,
  },
  headerBox: {
    borderBottomWidth: 1,
    borderBottomColor: "#666",
    paddingBottom: 4,
    marginBottom: 8,
    alignItems: "center",
  },
  title: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginTop: 2,
    textTransform: "uppercase",
  },
  vigenciaText: {
    fontSize: 7,
    marginTop: 2,
    color: "#374151",
    fontWeight: "bold",
  },
  turnoTitle: {
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 2,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#9ca3af",
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000",
    flexDirection: "column",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  tableHeader: {
    backgroundColor: "#e5e7eb", // gray-200
  },
  tableColHeaderTime: {
    width: "8%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tableColHeaderDay: {
    width: "18.4%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tableColHeaderDayLast: {
    width: "18.4%",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 7,
    fontWeight: "bold",
  },
  tableColTime: {
    width: "8%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    padding: 2,
    backgroundColor: "#f3f4f6", // gray-100
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
  },
  tableColDay: {
    width: "18.4%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    padding: 2,
  },
  tableColDayLast: {
    width: "18.4%",
    padding: 2,
  },
  cellContent: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  aulaBox: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 1,
  },
  aulaBoxBorderTop: {
    borderTopWidth: 1,
    borderTopColor: "#9ca3af",
    borderTopStyle: "dashed",
    marginTop: 1,
    paddingTop: 1,
  },
  discText: {
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 1,
    lineHeight: 1.1,
  },
  profText: {
    fontSize: 6,
    color: "#374151",
    textAlign: "center",
    marginBottom: 1,
    lineHeight: 1.1,
  },
  salaText: {
    fontSize: 6,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 1.1,
  },
});

interface PDFPublicoProps {
  dados: any;
  turnosOcupados: any[];
  diasSemana: any[];
  tipoFiltro: string;
  idSelecionado: string;
  titulo: string;
  dataVigencia: string;
}

export const PDFPublicoDocument = ({
  dados,
  turnosOcupados,
  diasSemana,
  tipoFiltro,
  idSelecionado,
  titulo,
  dataVigencia,
}: PDFPublicoProps) => {
  const getAulasPublico = (diaId: string, slotId: string) => {
    return dados.aulas.filter(
      (a: any) =>
        a.dia_semana === diaId &&
        String(a.slot_horario_id) === String(slotId) &&
        (tipoFiltro === "TURMA"
          ? String(a.turma_id) === String(idSelecionado)
          : tipoFiltro === "PROFESSOR"
            ? String(a.professor_id) === String(idSelecionado)
            : String(a.espaco_id) === String(idSelecionado))
    );
  };

  const formatarHora = (hora: string) => {
    if (!hora) return "";
    return hora.substring(0, 5);
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.section}>
          {/* Cabeçalho */}
          <View style={styles.headerBox}>
            <Text style={styles.title}>
              IFNMG - Campus Januária | Quadro de Horário
            </Text>
            <Text style={styles.subtitle}>{titulo}</Text>
            {dataVigencia && (
              <Text style={styles.vigenciaText}>
                Vigência: A partir de {dataVigencia}
              </Text>
            )}
          </View>

          {/* Turnos */}
          {turnosOcupados.map((turno: any, tIdx: number) => (
            <View key={`turno-${turno.nome}-${tIdx}`} style={{ marginBottom: 15 }} wrap={false}>
              <Text style={styles.turnoTitle}>TURNO: {turno.nome}</Text>

              {/* Tabela */}
              <View style={styles.table}>
                {/* Thead */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <View style={styles.tableColHeaderTime}>
                    <Text style={styles.headerText}>HORÁRIO</Text>
                  </View>
                  {diasSemana.map((dia, index) => (
                    <View
                      key={`th-${dia.id}`}
                      style={
                        index === diasSemana.length - 1
                          ? styles.tableColHeaderDayLast
                          : styles.tableColHeaderDay
                      }
                    >
                      <Text style={styles.headerText}>{dia.nome}</Text>
                    </View>
                  ))}
                </View>

                {/* Tbody */}
                {turno.slots.map((slot: any, slotIndex: number) => {
                  const isLastSlot = slotIndex === turno.slots.length - 1;

                  return (
                    <View
                      key={`slot-${slot.id}`}
                      style={[
                        styles.tableRow,
                        isLastSlot ? { borderBottomWidth: 0 } : {},
                      ]}
                    >
                      {/* Célula Hora */}
                      <View style={styles.tableColTime}>
                        <Text style={styles.timeText}>
                          {formatarHora(slot.hora_inicio)}
                        </Text>
                        <Text style={styles.timeText}>
                          {formatarHora(slot.hora_fim)}
                        </Text>
                      </View>

                      {/* Células Dias */}
                      {diasSemana.map((dia, index) => {
                        const aulasNoSlot = getAulasPublico(dia.id, slot.id);
                        const isLastDay = index === diasSemana.length - 1;

                        return (
                          <View
                            key={`td-${dia.id}`}
                            style={
                              isLastDay
                                ? styles.tableColDayLast
                                : styles.tableColDay
                            }
                          >
                            <View style={styles.cellContent}>
                              {aulasNoSlot.map((aula: any, i: number) => {
                                const disc = dados.disciplinas?.find(
                                  (d: any) =>
                                    String(d.id) === String(aula.disciplina_id)
                                );
                                const prof = dados.professores?.find(
                                  (p: any) =>
                                    String(p.id) === String(aula.professor_id)
                                );
                                const sala = dados.espacos?.find(
                                  (e: any) =>
                                    String(e.id) === String(aula.espaco_id)
                                );
                                const turma = dados.turmas?.find(
                                  (t: any) => String(t.id) === String(aula.turma_id)
                                );

                                const isSplit = aulasNoSlot.length > 1;

                                return (
                                  <View
                                    key={aula.id}
                                    style={[
                                      styles.aulaBox,
                                      isSplit && i > 0
                                        ? styles.aulaBoxBorderTop
                                        : {},
                                    ]}
                                  >
                                    <Text style={styles.discText}>
                                      {disc?.nome}
                                      {tipoFiltro !== "TURMA" && turma && ` (${turma.codigo})`}
                                    </Text>
                                    {tipoFiltro !== "PROFESSOR" && prof && (
                                      <Text style={styles.profText}>
                                        {prof.nome}
                                      </Text>
                                    )}
                                    {tipoFiltro !== "ESPACO" && sala && (
                                      <Text style={styles.salaText}>
                                        {sala.nome}
                                      </Text>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};
