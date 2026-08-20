import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// É importante registrar fontes se quiser usar pesos variados, mas as fontes padrão costumam bastar
// para um layout limpo. Vamos usar Helvetica, que é a padrão.

const styles = StyleSheet.create({
  page: {
    padding: 15,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    flexDirection: "column",
  },
  section: {
    flex: 1, // Each turma will try to occupy 50% of the page if there are 2
    marginBottom: 10,
  },
  headerBox: {
    borderBottomWidth: 1,
    borderBottomColor: "#666",
    paddingBottom: 2,
    marginBottom: 4,
    alignItems: "center",
  },
  title: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 8,
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
    fontSize: 6,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 1,
    lineHeight: 1.1,
  },
  profText: {
    fontSize: 5,
    color: "#374151",
    textAlign: "center",
    marginBottom: 1,
    lineHeight: 1.1,
  },
  salaText: {
    fontSize: 5,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 1.1,
  },
});

const dias = [
  { id: "SEGUNDA", label: "SEGUNDA" },
  { id: "TERCA", label: "TERÇA" },
  { id: "QUARTA", label: "QUARTA" },
  { id: "QUINTA", label: "QUINTA" },
  { id: "SEXTA", label: "SEXTA" },
];

interface PDFIntegradoProps {
  dados: any;
}

export const PDFIntegradoDocument = ({ dados }: PDFIntegradoProps) => {
  const getAulasNoSlot = (turmaId: string, diaId: string, slotId: string) => {
    return (
      dados?.aulas?.filter(
        (a: any) =>
          String(a.turma_id) === String(turmaId) &&
          a.dia_semana === diaId &&
          String(a.slot_horario_id) === String(slotId)
      ) || []
    );
  };

  const formatarData = (dataStr: string) => {
    if (!dataStr) return "";
    // If it comes with time like '2026-08-10T00:00:00'
    const justDate = dataStr.split("T")[0];
    const [ano, mes, dia] = justDate.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const dataVigencia = dados?.versao?.data_inicio_vigencia
    ? formatarData(dados.versao.data_inicio_vigencia)
    : "";

  // Flatten the turmas to chunk them into pages of 2
  const todasTurmas: any[] = [];
  dados?.grupos?.forEach((grupo: any) => {
    grupo.turmas.forEach((turma: any) => {
      todasTurmas.push({
        ...turma,
        nomeGrupo: grupo.nomeGrupo,
      });
    });
  });

  const chunkedTurmas = [];
  for (let i = 0; i < todasTurmas.length; i += 2) {
    chunkedTurmas.push(todasTurmas.slice(i, i + 2));
  }

  return (
    <Document>
      {chunkedTurmas.map((chunk, pageIndex) => (
        <Page key={`page-${pageIndex}`} size="A4" orientation="portrait" style={styles.page}>
          {chunk.map((turma: any) => (
            <View key={turma.id} style={styles.section}>
              {/* Cabeçalho */}
              <View style={styles.headerBox}>
                <Text style={styles.title}>
                  IFNMG - Campus Januária | Quadro de Horário: {turma.nomeGrupo}
                </Text>
                <Text style={styles.subtitle}>TURMA: {turma.codigo}</Text>
                {dataVigencia && (
                  <Text style={styles.vigenciaText}>
                    Vigência: a partir de {dataVigencia}
                  </Text>
                )}
              </View>

              {/* Tabela */}
              <View style={styles.table}>
                {/* Thead */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <View style={styles.tableColHeaderTime}>
                    <Text style={styles.headerText}>HORÁRIO</Text>
                  </View>
                  {dias.map((d, index) => (
                    <View
                      key={d.id}
                      style={
                        index === dias.length - 1
                          ? styles.tableColHeaderDayLast
                          : styles.tableColHeaderDay
                      }
                    >
                      <Text style={styles.headerText}>{d.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Tbody */}
                {dados.slots.map((slot: any, slotIndex: number) => {
                  const isLastSlot = slotIndex === dados.slots.length - 1;
                  
                  return (
                    <View
                      key={slot.id}
                      style={[
                        styles.tableRow,
                        isLastSlot ? { borderBottomWidth: 0 } : {},
                      ]}
                    >
                      {/* Célula Hora */}
                      <View style={styles.tableColTime}>
                        <Text style={styles.timeText}>
                          {slot.hora_inicio.substring(0, 5)}
                        </Text>
                        <Text style={styles.timeText}>
                          {slot.hora_fim.substring(0, 5)}
                        </Text>
                      </View>

                      {/* Células Dias */}
                      {dias.map((dia, index) => {
                        const aulasNoSlot = getAulasNoSlot(
                          turma.id,
                          dia.id,
                          slot.id
                        );
                        const isLastDay = index === dias.length - 1;

                        return (
                          <View
                            key={dia.id}
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
                                    </Text>
                                    <Text style={styles.profText}>
                                      {prof?.nome}
                                    </Text>
                                    <Text style={styles.salaText}>
                                      {sala?.nome || "S/S"}
                                    </Text>
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
        </Page>
      ))}
    </Document>
  );
};
