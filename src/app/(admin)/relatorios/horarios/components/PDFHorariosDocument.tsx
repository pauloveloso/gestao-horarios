import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
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
    borderBottomColor: "#9ca3af", // gray-400 equivalent
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  logo: {
    height: 40,
    marginRight: 10,
  },
  headerTitleBlock: {
    flexDirection: "column",
  },
  headerInstText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  headerCampusText: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  headerDeptText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 4,
  },
  headerCursoText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  headerTurmaText: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 4,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000",
    flexDirection: "column",
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    flex: 1,
  },
  tableHeaderRow: {
    flexDirection: "row",
  },
  tableRowIntervalo: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6", // gray-100
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  tableColHeaderTime: {
    width: "16%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#e5e7eb", // gray-200
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tableColHeaderDay: {
    width: "16.8%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#e5e7eb", // gray-200
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tableColHeaderDayLast: {
    width: "16.8%",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#e5e7eb", // gray-200
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  tableColTime: {
    width: "16%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#f9fafb", // gray-50 equivalent
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  timeTextBig: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },
  timeTextSmall: {
    fontSize: 9,
    textAlign: "center",
  },
  tableColDay: {
    width: "16.8%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tableColDayLast: {
    width: "16.8%",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  intervalText: {
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  aulaBox: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  discText: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 2,
    lineHeight: 1.1,
  },
  salaText: {
    fontSize: 8,
    color: "#374151",
    textAlign: "center",
    marginBottom: 2,
    lineHeight: 1.1,
  },
  profText: {
    fontSize: 8,
    color: "#1f2937",
    fontWeight: "bold",
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

const formatarSemestreInteligente = (sem: string, nomeCurso: string) => {
  if (!sem || !sem.includes(".")) return sem;
  const [ano, periodo] = sem.split(".");

  const isIntegrado =
    nomeCurso?.toLowerCase().includes("integrado") ||
    nomeCurso?.toLowerCase().includes("técnico");

  if (isIntegrado) {
    return `ANO LETIVO DE ${ano}`;
  }

  return `${periodo === "1" ? "PRIMEIRO" : "SEGUNDO"} SEMESTRE LETIVO DE ${ano}`;
};

const formatarHora = (hora: string) => (hora ? hora.substring(0, 5) : "");

interface PDFHorariosProps {
  paginas: any[];
  versaoAtivaDetalhes: any;
  // A URL base the client is running on, to resolve the image properly
  originUrl?: string; 
}

export const PDFHorariosDocument = ({ paginas, versaoAtivaDetalhes, originUrl }: PDFHorariosProps) => {
  const logoUrl = originUrl ? `${originUrl}/logo-ifnmg.png` : "/logo-ifnmg.png";

  return (
    <Document>
      {paginas.map((pagina: any, pageIndex: number) => (
        <Page
          key={`page-${pageIndex}`}
          size="A4"
          orientation="landscape"
          style={styles.page}
        >
          <View wrap={false} style={{ flex: 1, flexDirection: "column" }}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.headerLogoRow}>
              <Image src={logoUrl} style={styles.logo} />
              <View style={styles.headerTitleBlock}>
                <Text style={styles.headerInstText}>
                  INSTITUTO FEDERAL DE EDUCAÇÃO, CIÊNCIA E TECNOLOGIA
                </Text>
                <Text style={styles.headerCampusText}>
                  NORTE DE MINAS GERAIS - Campus Januária
                </Text>
              </View>
            </View>

            <Text style={styles.headerDeptText}>
              DEPARTAMENTO DE ENSINO SUPERIOR
            </Text>
            <Text style={styles.headerCursoText}>
              COORDENAÇÃO DE CURSO {pagina.turma.curso_nome}
            </Text>
            <Text style={styles.headerTurmaText}>
              {pagina.turma.codigo} - {pagina.turnoNome} -{" "}
              {formatarSemestreInteligente(
                versaoAtivaDetalhes?.semestre,
                pagina.turma.curso_nome
              )}
            </Text>
          </View>

          {/* Tabela */}
          <View style={styles.table}>
            {/* Thead */}
            <View style={styles.tableHeaderRow}>
              <View style={styles.tableColHeaderTime}>
                <Text style={styles.headerText}>HORÁRIO</Text>
              </View>
              {diasSemana.map((d, index) => (
                <View
                  key={d.id}
                  style={
                    index === diasSemana.length - 1
                      ? styles.tableColHeaderDayLast
                      : styles.tableColHeaderDay
                  }
                >
                  <Text style={styles.headerText}>{d.nome}</Text>
                </View>
              ))}
            </View>

            {/* Tbody */}
            {pagina.slots.map((slot: any, slotIndex: number) => {
              let intervalo = null;
              if (slotIndex > 0) {
                const fimAnterior = pagina.slots[slotIndex - 1].hora_fim;
                if (slot.hora_inicio !== fimAnterior) {
                  intervalo = (
                    <View key={`intervalo-${slotIndex}`} style={styles.tableRowIntervalo}>
                      <View style={{ width: "100%" }}>
                        <Text style={styles.intervalText}>INTERVALO</Text>
                      </View>
                    </View>
                  );
                }
              }

              const isLastSlot = slotIndex === pagina.slots.length - 1;

              return (
                <React.Fragment key={slot.id}>
                  {intervalo}
                  <View style={styles.tableRow}>
                    {/* Célula Hora */}
                    <View
                      style={[
                        styles.tableColTime,
                        isLastSlot ? { borderBottomWidth: 0 } : {},
                      ]}
                    >
                      <Text style={styles.timeTextBig}>{slotIndex + 1}º</Text>
                      <Text style={styles.timeTextSmall}>
                        {formatarHora(slot.hora_inicio)}-
                        {formatarHora(slot.hora_fim)}
                      </Text>
                    </View>

                    {/* Células Dias */}
                    {diasSemana.map((dia, index) => {
                      const aula = pagina.aulas.find(
                        (a: any) =>
                          a.dia_semana === dia.id &&
                          String(a.slot_horario_id) === String(slot.id)
                      );
                      const isLastDay = index === diasSemana.length - 1;

                      return (
                        <View
                          key={dia.id}
                          style={[
                            isLastDay
                              ? styles.tableColDayLast
                              : styles.tableColDay,
                            isLastSlot ? { borderBottomWidth: 0 } : {},
                          ]}
                        >
                          {aula ? (
                            <View style={styles.aulaBox}>
                              <Text style={styles.discText}>
                                {aula.disciplina_nome}
                              </Text>
                              <Text style={styles.salaText}>
                                {aula.espaco_nome}
                              </Text>
                              <Text style={styles.profText}>
                                {aula.professor_nome}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </React.Fragment>
              );
            })}
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
};
