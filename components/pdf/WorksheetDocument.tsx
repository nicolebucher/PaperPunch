import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatProfileMeta, type Profile, type Task, type WorksheetData } from "@/types/generation";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  brand: { marginBottom: 10, fontSize: 13, fontFamily: "Helvetica-BoldOblique", color: "#0e9fb1" },
  header: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  meta: { fontSize: 10, color: "#666666" },
  intro: { marginBottom: 16, fontSize: 11, lineHeight: 1.4 },
  task: { marginBottom: 20 },
  taskHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  taskNumber: { fontWeight: 700 },
  points: { color: "#888888", fontSize: 9 },
  option: { marginLeft: 12, marginTop: 3 },
  answerLine: { borderBottom: "1pt solid #cccccc", marginTop: 14, height: 28 },
  underlineRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  underlineWord: { marginRight: 14, marginBottom: 4, textDecoration: "underline" },
  matchRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  matchColumn: { width: "47%" },
  matchLine: { flexDirection: "row", marginBottom: 8 },
  matchBlank: { width: 22, borderBottom: "1pt solid #999999", marginRight: 6 },
  solutionsTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12 },
  solutionRow: { marginBottom: 8 },
});

function TaskBody({ task }: { task: Task }) {
  if (task.type === "multiple-choice") {
    return (
      <>
        {task.options?.map((option, i) => (
          <Text key={i} style={styles.option}>
            {String.fromCharCode(65 + i)}) {option}
          </Text>
        ))}
      </>
    );
  }

  if (task.type === "unterstreichen") {
    return (
      <View style={styles.underlineRow}>
        {task.options?.map((option, i) => (
          <Text key={i} style={styles.underlineWord}>
            {option}
            {i < (task.options?.length ?? 0) - 1 ? "  /" : ""}
          </Text>
        ))}
      </View>
    );
  }

  if (task.type === "zuordnen" && task.pairs) {
    const shuffledRight = task.pairs.map((p) => p.right).reduce<string[]>((acc, _, i, arr) => {
      // deterministischer "Shuffle" (Rotation), damit die rechte Spalte nicht in Reihenfolge steht
      acc.push(arr[(i + 1) % arr.length]);
      return acc;
    }, []);
    return (
      <View style={styles.matchRow}>
        <View style={styles.matchColumn}>
          {task.pairs.map((pair, i) => (
            <View key={i} style={styles.matchLine}>
              <View style={styles.matchBlank} />
              <Text>
                {i + 1}. {pair.left}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.matchColumn}>
          {shuffledRight.map((right, i) => (
            <Text key={i} style={styles.matchLine}>
              {String.fromCharCode(65 + i)}. {right}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  // "offen" und "lueckentext"
  return <View style={styles.answerLine} />;
}

export function WorksheetDocument({ data, profile }: { data: WorksheetData; profile: Profile }) {
  const labels = data.labels;
  const meta = formatProfileMeta(profile, labels.grade);
  // Erzwingt mindestens 3 Seiten: die Aufgaben werden in drei Drittel geteilt,
  // jedes Drittel beginnt garantiert auf einer neuen Seite (unabhängig von der Textlänge).
  const groupSize = Math.max(1, Math.ceil(data.tasks.length / 3));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>PaperPunch</Text>
        <View style={styles.header}>
          <Text style={styles.title}>{data.title}</Text>
          {meta && <Text style={styles.meta}>{meta}</Text>}
        </View>
        <Text style={styles.intro}>{data.introduction}</Text>
        {data.tasks.map((task, index) => (
          <View
            key={task.number}
            style={styles.task}
            wrap={false}
            break={index > 0 && index % groupSize === 0}
          >
            <View style={styles.taskHeader}>
              <Text style={styles.taskNumber}>
                {labels.task} {task.number}
              </Text>
              <Text style={styles.points}>
                {task.points} {labels.points}
              </Text>
            </View>
            <Text>{task.question}</Text>
            <TaskBody task={task} />
          </View>
        ))}
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>PaperPunch</Text>
        <Text style={styles.solutionsTitle}>
          {labels.solutions} — {data.title}
        </Text>
        {data.tasks.map((task) => (
          <View key={task.number} style={styles.solutionRow}>
            <Text>
              <Text style={{ fontWeight: 700 }}>
                {labels.task} {task.number}:{" "}
              </Text>
              {task.answer}
            </Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
