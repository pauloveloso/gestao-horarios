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
    padding: 24,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    flexDirection: "column",
    position: "relative",
  },
  watermarkContainer: {
    position: "absolute",
    top: "-50%",
    left: "-25%",
    width: "150%",
    height: "200%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    opacity: 0.15,
  },
  watermarkRow: {
    flexDirection: "row",
    marginBottom: 30,
    transform: "rotate(-35deg)",
  },
  watermarkText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginHorizontal: 20,
    color: "#000",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#9ca3af",
    paddingBottom: 4,
    marginBottom: 8,
  },
  logo: {
    height: 40,
    marginRight: 16,
  },
  headerTextCol: {
    flexDirection: "column",
    alignItems: "center",
  },
  instText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  subInstText: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 2,
  },
  turmaInfoBox: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 8,
  },
  requerimentoText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  cursoText: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 2,
  },
  semestreText: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 2,
  },
  codigoTurmaText: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 4,
  },
  tableContainer: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    marginBottom: 8,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000",
    flexDirection: "column",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableRowIntervalo: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6", // gray-100
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  tableColHeaderTime: {
    width: "14%",
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
    width: "17.2%",
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
    width: "17.2%",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#e5e7eb", // gray-200
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  tableColTime: {
    width: "14%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#f9fafb", // gray-50
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  timeTextBig: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
  },
  timeTextSmall: {
    fontSize: 9,
    textAlign: "center",
  },
  tableColDay: {
    width: "17.2%",
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tableColDayLast: {
    width: "17.2%",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    padding: 2,
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
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 2,
    lineHeight: 1.2,
    textTransform: "uppercase",
  },
  salaText: {
    fontSize: 7,
    color: "#374151",
    textAlign: "center",
    marginBottom: 2,
    lineHeight: 1.2,
    textTransform: "uppercase",
  },
  profText: {
    fontSize: 7,
    color: "#374151",
    textAlign: "center",
    lineHeight: 1.2,
    textTransform: "uppercase",
  },
  instructionsBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#000",
    padding: 6,
    backgroundColor: "#f9fafb",
  },
  instructionsText: {
    fontSize: 8,
    textAlign: "justify",
    lineHeight: 1.4,
    marginBottom: 4,
  },
  instructionsBold: {
    fontWeight: "bold",
  },
  footer: {
    marginTop: "auto", // Push to bottom
    flexDirection: "row",
    paddingTop: 10,
  },
  signatureCol: {
    flex: 1,
    marginRight: 20,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    height: 20,
    marginBottom: 4,
  },
  signatureText: {
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    color: "#1f2937",
  },
  dateCol: {
    flex: 0.5,
    marginRight: 10,
  },
  turmaCol: {
    flex: 0.5,
  },
  dateLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    height: 20,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 7,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#1f2937",
    marginLeft: 4,
  },

  // ESTILOS COMPACTOS (APENAS PARA PÁGINAS COM MUITOS HORÁRIOS)
  pageCompact: { paddingTop: 16, paddingBottom: 16 },
  watermarkRowCompact: { marginBottom: 30 },
  logoCompact: { height: 32, marginRight: 12 },
  headerRowCompact: { paddingBottom: 2, marginBottom: 4 },
  instTextCompact: { },
  subInstTextCompact: { },
  turmaInfoBoxCompact: { marginBottom: 4 },
  requerimentoTextCompact: { },
  cursoTextCompact: { },
  semestreTextCompact: { },
  codigoTurmaTextCompact: { fontSize: 14, marginTop: 2 },
  
  tableColHeaderTimeCompact: { padding: 2 },
  tableColHeaderDayCompact: { padding: 2 },
  headerTextCompact: { },
  
  tableColTimeCompact: { padding: 2 },
  timeTextSmallCompact: { },
  
  tableColDayCompact: { padding: 1 },
  discTextCompact: { marginBottom: 1 },
  salaTextCompact: { marginBottom: 1 },
  profTextCompact: { },
  
  intervalTextCompact: { paddingVertical: 2 },
  
  instructionsBoxCompact: { marginTop: 4, padding: 4 },
  instructionsTextCompact: { marginBottom: 2 },
  
  footerCompact: { paddingTop: 6 },
  signatureLineCompact: { marginBottom: 2 },
  signatureTextCompact: { },
  dateLineCompact: { marginBottom: 2 },
  dateTextCompact: { },
});

const diasSemana = [
  { id: "SEGUNDA", nome: "SEGUNDA" },
  { id: "TERCA", nome: "TERÇA" },
  { id: "QUARTA", nome: "QUARTA" },
  { id: "QUINTA", nome: "QUINTA" },
  { id: "SEXTA", nome: "SEXTA" },
];

const formatarHora = (hora: string) => (hora ? hora.substring(0, 5) : "");

const formatarSemestreInteligente = (sem: string, nomeCurso: string) => {
  if (!sem || !sem.includes(".")) return sem;
  const [ano, periodo] = sem.split(".");

  const isIntegrado =
    nomeCurso?.toLowerCase().includes("integrado") ||
    nomeCurso?.toLowerCase().includes("técnico");

  if (isIntegrado) {
    return `ANO LETIVO DE ${ano}`;
  }

  return `${periodo}º SEMESTRE LETIVO / ${ano}`;
};

interface PDFFichasProps {
  paginas: any[];
  versaoAtivaDetalhes: any;
  originUrl?: string;
}

export const PDFFichasDocument = ({ paginas, versaoAtivaDetalhes, originUrl }: PDFFichasProps) => {
  const logoUrl = originUrl ? `${originUrl}/logo-ifnmg.png` : "/logo-ifnmg.png";

  return (
    <Document>
      {paginas.map((pagina: any, pageIndex: number) => {
        const isCompact = pagina.slots.length > 5;

        return (
          <Page
            key={`page-${pageIndex}`}
            size="A4"
            orientation="landscape"
            style={[styles.page, isCompact && styles.pageCompact]}
            wrap={false}
          >
            <View style={[styles.headerRow, isCompact && styles.headerRowCompact]}>
              <Image src={logoUrl} style={[styles.logo, isCompact && styles.logoCompact]} />
              <View style={styles.headerTextCol}>
                <Text style={[styles.instText, isCompact && styles.instTextCompact]}>Instituto Federal</Text>
                <Text style={[styles.subInstText, isCompact && styles.subInstTextCompact]}>Norte de Minas Gerais</Text>
                <Text style={[styles.subInstText, isCompact && styles.subInstTextCompact]}>Campus Januária</Text>
              </View>
            </View>

            <View style={[styles.turmaInfoBox, isCompact && styles.turmaInfoBoxCompact]}>
              <Text style={[styles.requerimentoText, isCompact && styles.requerimentoTextCompact]}>
                REQUERIMENTO DE RENOVAÇÃO DE MATRÍCULA
              </Text>
              <Text style={[styles.cursoText, isCompact && styles.cursoTextCompact]}>
                COORDENAÇÃO DO CURSO DE {pagina.turma.curso_nome}
              </Text>
              <Text style={[styles.semestreText, isCompact && styles.semestreTextCompact]}>
                {formatarSemestreInteligente(
                  versaoAtivaDetalhes?.semestre,
                  pagina.turma.curso_nome
                )}
              </Text>
              <Text style={[styles.codigoTurmaText, isCompact && styles.codigoTurmaTextCompact]}>{pagina.turma.codigo}</Text>
            </View>

            <View style={styles.tableContainer}>
              <View style={styles.table}>
                {/* Thead */}
              <View style={styles.tableRow}>
                <View style={[styles.tableColHeaderTime, isCompact && styles.tableColHeaderTimeCompact]}>
                  <Text style={[styles.headerText, isCompact && styles.headerTextCompact]}>HORÁRIO</Text>
                </View>
                {diasSemana.map((d, index) => (
                  <View
                    key={d.id}
                    style={[
                      index === diasSemana.length - 1
                        ? styles.tableColHeaderDayLast
                        : styles.tableColHeaderDay,
                      isCompact && styles.tableColHeaderDayCompact
                    ]}
                  >
                    <Text style={[styles.headerText, isCompact && styles.headerTextCompact]}>{d.nome}</Text>
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
                          <Text style={[styles.intervalText, isCompact && styles.intervalTextCompact]}>
                            INTERVALO: {formatarHora(fimAnterior)} às {formatarHora(slot.hora_inicio)}
                          </Text>
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
                          isCompact && styles.tableColTimeCompact,
                          isLastSlot ? { borderBottomWidth: 0 } : {},
                        ]}
                      >
                        <Text style={[styles.timeTextSmall, isCompact && styles.timeTextSmallCompact]}>
                          {formatarHora(slot.hora_inicio)}
                        </Text>
                        <Text style={[styles.timeTextSmall, isCompact && styles.timeTextSmallCompact]}>às</Text>
                        <Text style={[styles.timeTextSmall, isCompact && styles.timeTextSmallCompact]}>
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
                              isCompact && styles.tableColDayCompact,
                              isLastSlot ? { borderBottomWidth: 0 } : {},
                            ]}
                          >
                            {aula ? (
                              <View style={styles.aulaBox}>
                                <Text style={[styles.discText, isCompact && styles.discTextCompact]}>
                                  (    ) {aula.disciplina_nome}
                                </Text>
                                <Text style={[styles.salaText, isCompact && styles.salaTextCompact]}>
                                  {aula.espaco_nome}
                                </Text>
                                <Text style={[styles.profText, isCompact && styles.profTextCompact]}>
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

              {/* Marca d'água (Renderizada por cima da tabela para evitar ser sobreposta pelo fundo das células) */}
              <View style={styles.watermarkContainer}>
                {Array.from({ length: 24 }).map((_, rIdx) => (
                  <View key={`wm-r-${rIdx}`} style={[styles.watermarkRow, isCompact && styles.watermarkRowCompact]}>
                    {Array.from({ length: 5 }).map((_, cIdx) => (
                      <Text key={`wm-c-${cIdx}`} style={styles.watermarkText}>
                        INSTITUTO FEDERAL DO NORTE DE MINAS GERAIS - CAMPUS JANUÁRIA
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.instructionsBox, isCompact && styles.instructionsBoxCompact]}>
              <Text style={[styles.instructionsText, isCompact && styles.instructionsTextCompact]}>
                A matrícula é responsabilidade do acadêmico. Antes de efetivá-la, leia os Regulamentos dos Cursos Superiores do IFNMG.
                Após fazer a escolha da disciplina, <Text style={styles.instructionsBold}>ANULAR os quadros das disciplinas que NÃO serão cursadas</Text>.
              </Text>
              <Text style={[styles.instructionsText, styles.instructionsBold, isCompact && styles.instructionsTextCompact, { marginBottom: 0 }]}>
                Disciplinas que são pré-requisitos para disciplinas futuras. Recomenda-se prioridade.
              </Text>
            </View>

            <View style={[styles.footer, isCompact && styles.footerCompact]}>
              <View style={styles.signatureCol}>
                <View style={[styles.signatureLine, isCompact && styles.signatureLineCompact]}></View>
                <Text style={[styles.signatureText, isCompact && styles.signatureTextCompact]}>
                  Assinatura do Acadêmico/Responsável
                </Text>
              </View>
              <View style={styles.dateCol}>
                <View style={[styles.dateLine, isCompact && styles.dateLineCompact]}></View>
                <Text style={[styles.dateText, isCompact && styles.dateTextCompact]}>Data</Text>
              </View>
              <View style={styles.turmaCol}>
                <View style={[styles.dateLine, isCompact && styles.dateLineCompact]}></View>
                <Text style={[styles.dateText, isCompact && styles.dateTextCompact]}>Turma</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};
