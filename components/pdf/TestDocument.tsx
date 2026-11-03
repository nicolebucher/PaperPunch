import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { MathText, PdfBrand } from "./PdfParts";
import { formatProfileMeta, type Profile, type Task, type WorksheetData } from "@/types/generation";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  header: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  meta: { fontSize: 10, color: "#666666" },
  nameLine: { marginTop: 12, fontSize: 10, borderBottom: "1pt solid #cccccc", paddingBottom: 16 },
  intro: { marginTop: 16, marginBottom: 16, fontSize: 11, lineHeight: 1.4 },
  task: { marginBottom: 16 },
  taskHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  taskNumber: { fontWeight: 700 },
  points: { color: "#888888", fontSize: 9 },
  option: { marginLeft: 12, marginTop: 2 },
  answerLine: { borderBottom: "1pt solid #cccccc", marginTop: 12, height: 20 },
  underlineRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  underlineWord: { marginRight: 14, marginBottom: 4, textDecoration: "underline" },
  matchRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  matchColumn: { width: "47%" },
  matchLine: { flexDirection: "row", marginBottom: 6 },
  matchBlank: { width: 22, borderBottom: "1pt solid #999999", marginRight: 6 },
  solutionsTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12 },
  solutionRow: { marginBottom: 8 },
});

function TaskBody({ task }: { task: Task }) {
  if (task.type === "multiple-choice") {
    return (
      <>
        {task.options?.map((option, i) => (
          <MathText key={i} style={styles.option} prefix={`${String.fromCharCode(65 + i)}) `}>
            {option}
          </MathText>
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

  return <View style={styles.answerLine} />;
}

export function TestDocument({ data, profile }: { data: WorksheetData; profile: Profile }) {
  const labels = data.labels;
  const totalPoints = data.tasks.reduce((sum, task) => sum + task.points, 0);
  const meta = formatProfileMeta(profile, labels.grade);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfBrand />
        <View style={styles.header}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.meta}>{[meta, `${totalPoints} ${labels.totalPoints}`].filter(Boolean).join(" · ")}</Text>
        </View>
        <Text style={styles.nameLine}>
          {labels.name}: ______________________________  {labels.date}: ______________
        </Text>
        <Text style={styles.intro}>{data.introduction}</Text>
        {data.tasks.map((task) => (
          <View key={task.number} style={styles.task} wrap={false}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskNumber}>
                {labels.task} {task.number}
              </Text>
              <Text style={styles.points}>
                {task.points} {labels.points}
              </Text>
            </View>
            <MathText>{task.question}</MathText>
            <TaskBody task={task} />
          </View>
        ))}
      </Page>
      <Page size="A4" style={styles.page}>
        <PdfBrand />
        <Text style={styles.solutionsTitle}>
          {labels.solutions} — {data.title}
        </Text>
        {data.tasks.map((task) => (
          <View key={task.number} style={styles.solutionRow}>
            <MathText prefix={<Text style={{ fontWeight: 700 }}>{`${labels.task} ${task.number}: `}</Text>}>{task.answer}</MathText>
          </View>
        ))}
      </Page>
    </Document>
  );
}
