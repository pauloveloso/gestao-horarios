import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    flexDirection: "column",
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#9ca3af",
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 2,
  },
  headerVigencia: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#4b5563",
    textTransform: "uppercase",
    marginTop: 4,
  },
  salaHeader: {
    backgroundColor: "#e5e7eb", // gray-200
    borderWidth: 1,
    borderColor: "#000",
    borderBottomWidth: 0,
    padding: 4,
    alignItems: "center",
  },
  salaHeaderText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  turnoHeader: {
    backgroundColor: "#f9fafb", // gray-50
    borderWidth: 1,
    borderColor: "#000",
    borderBottomWidth: 0,
    borderTopWidth: 0,
    padding: 2,
    alignItems: "center",
  },
  turnoHeaderText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#1f2937", // gray-800
    textTransform: "uppercase",
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000",
    flexDirection: "column",
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableColHeaderTime: {
    width: "10%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#f3f4f6", // gray-100
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tableColHeaderDay: {
    width: "18%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#f3f4f6", // gray-100
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tableColHeaderDayLast: {
    width: "18%",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#f3f4f6", // gray-100
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 7,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  tableColTime: {
    width: "10%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#f9fafb", // gray-50
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  tableColDay: {
    width: "18%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tableColDayLast: {
    width: "18%",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
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
  turmaText: {
    fontSize: 6,
    color: "#1f2937", // gray-800
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 1,
    lineHeight: 1.1,
  },
  profText: {
    fontSize: 6,
    color: "#4b5563", // gray-600
    textAlign: "center",
    lineHeight: 1.1,
  },
});

const diasSemana = [
  { id: "SEGUNDA", nome: "SEGUNDA" },
  { id: "TERCA", nome: "TERÇA" },
  { id: "QUARTA", nome: "QUARTA" },
  { id: "QUINTA", nome: "QUINTA" },
  { id: "SEXTA", nome: "SEXTA" },
];

const formatarHora = (hora: string) => (hora ? hora.substring(0, 5) : "");

const formatarData = (dataStr: string) => {
  if (!dataStr) return "";
  const data = new Date(dataStr);
  return new Date(
    data.getTime() + data.getTimezoneOffset() * 60000,
  ).toLocaleDateString("pt-BR");
};

interface PDFOcupacaoSalasProps {
  dados: any;
  infoVersao: any;
  infoCategoria: any;
  espacosFiltrados: any[];
  todosTurnos: any[];
}

export const PDFOcupacaoSalasDocument = ({
  dados,
  infoVersao,
  infoCategoria,
  espacosFiltrados,
  todosTurnos,
}: PDFOcupacaoSalasProps) => {
  
  const getAulasNoEspaco = (espacoId: string, diaId: string, slotId: string) => {
    return dados.aulas.filter(
      (a: any) =>
        String(a.espaco_id) === String(espacoId) &&
        a.dia_semana === diaId &&
        String(a.slot_horario_id) === String(slotId)
    );
  };

  return (
    <Document>
      {espacosFiltrados.map((espaco: any, espacoIndex: number) => {
        const aulasDesteEspaco = dados.aulas.filter(
          (a: any) => String(a.espaco_id) === String(espaco.id)
        );

        const slotsOcupadosIds = new Set(
          aulasDesteEspaco.map((a: any) => String(a.slot_horario_id))
        );

        // Mapeia os 3 turnos, forçando 4 horários padrão e testando ocupação a partir do 5º
        const turnosParaExibir = todosTurnos.map((turno) => ({
          ...turno,
          slots: turno.slots.filter((slot: any, index: number) => {
            if (index < 4) return true;
            return slotsOcupadosIds.has(String(slot.id));
          }),
        }));

        return (
          <Page
            key={`page-${espaco.id}`}
            size="A4"
            orientation="landscape"
            style={styles.page}
          >
            {/* Cabeçalho */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                IFNMG - Campus Januária | Ocupação de Espaços
              </Text>
              <Text style={styles.headerSubtitle}>
                CATEGORIA: {infoCategoria?.nome}
              </Text>
              {infoVersao && (
                <Text style={[styles.headerVigencia, infoVersao.status === "RASCUNHO" ? { color: "#dc2626" } : {}]}>
                  Vigência: A partir de {formatarData(infoVersao.data_inicio_vigencia)}
                  {infoVersao.status === "RASCUNHO" ? " (NÃO OFICIAL - RASCUNHO)" : ""}
                </Text>
              )}
            </View>

            {/* Sala Header */}
            <View style={styles.salaHeader}>
              <Text style={styles.salaHeaderText}>
                SALA: {espaco.nome}{" "}
                {espaco.capacidade
                  ? `(Capacidade: ${espaco.capacidade} lugares)`
                  : ""}
              </Text>
            </View>

            {turnosParaExibir.map((turno, tIdx) => {
              const isLastTurno = tIdx === turnosParaExibir.length - 1;
              return (
                <View key={`turno-${turno.nome}-${tIdx}`}>
                  <View style={styles.turnoHeader}>
                    <Text style={styles.turnoHeaderText}>
                      TURNO: {turno.nome}
                    </Text>
                  </View>

                  <View style={[styles.table, isLastTurno ? { marginBottom: 0 } : {}]}>
                    {/* Thead */}
                    <View style={styles.tableRow}>
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
                    {turno.slots.map((slot: any, slotIdx: number) => {
                      const isLastSlot = slotIdx === turno.slots.length - 1;
                      return (
                        <View key={`slot-${slot.id}`} style={styles.tableRow}>
                          <View
                            style={[
                              styles.tableColTime,
                              isLastSlot ? { borderBottomWidth: 0 } : {},
                            ]}
                          >
                            <Text style={styles.timeText}>
                              {formatarHora(slot.hora_inicio)}
                            </Text>
                            <Text style={styles.timeText}>
                              {formatarHora(slot.hora_fim)}
                            </Text>
                          </View>

                          {diasSemana.map((dia, index) => {
                            const aulasNoSlot = getAulasNoEspaco(
                              espaco.id,
                              dia.id,
                              slot.id
                            );
                            const isLastDay = index === diasSemana.length - 1;
                            const isSplit = aulasNoSlot.length > 1;

                            return (
                              <View
                                key={`td-${dia.id}`}
                                style={[
                                  isLastDay
                                    ? styles.tableColDayLast
                                    : styles.tableColDay,
                                  isLastSlot ? { borderBottomWidth: 0 } : {},
                                ]}
                              >
                                {aulasNoSlot.map((aula: any, aIdx: number) => {
                                  const disc = dados.disciplinas.find(
                                    (d: any) => String(d.id) === String(aula.disciplina_id)
                                  );
                                  const prof = dados.professores.find(
                                    (p: any) => String(p.id) === String(aula.professor_id)
                                  );
                                  const turma = dados.turmas.find(
                                    (t: any) => String(t.id) === String(aula.turma_id)
                                  );

                                  return (
                                    <View
                                      key={`aula-${aula.id}-${aIdx}`}
                                      style={[
                                        styles.aulaBox,
                                        isSplit && aIdx > 0
                                          ? styles.aulaBoxBorderTop
                                          : {},
                                      ]}
                                    >
                                      <Text style={styles.discText}>
                                        {disc?.nome}
                                      </Text>
                                      <Text style={styles.turmaText}>
                                        {turma?.codigo}
                                      </Text>
                                      <Text style={styles.profText}>
                                        {prof?.nome || "A DEFINIR"}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </Page>
        );
      })}
    </Document>
  );
};
