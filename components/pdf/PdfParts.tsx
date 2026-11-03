import type { ReactNode } from "react";
import { G, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";

type Style = Parameters<typeof StyleSheet.create>[0][string];

// Gemeinsame Bausteine für Arbeitsblatt- und Test-PDF: das echte Logo (Buch mit bunten Pixeln)
// und Text, in dem Brüche wie in der Schule untereinander stehen (Zähler, Bruchstrich, Nenner).

const PIXELS: [number, number, string][] = [
  [114, 44, "#1FD6EA"], [118, 72, "#1FD6EA"], [124, 28, "#F23A8E"], [132, 86, "#A8E43A"],
  [134, 56, "#F23A8E"], [150, 46, "#A8E43A"], [150, 74, "#F23A8E"], [150, 92, "#1FD6EA"],
  [148, 14, "#A8E43A"], [160, 30, "#F23A8E"], [170, 56, "#1FD6EA"], [172, 82, "#F23A8E"],
];
const BOOK = [
  "M92 30C78 20 58 17 40 19V88C58 86 78 89 92 98Z",
  "M32 26V94C52 92 74 94 92 104",
  "M24 33V100C48 98 72 100 92 110",
  "M92 30C100 24 108 21 114 20",
  "M92 98C98 94 104 92 110 91",
  "M92 30V98",
  "M52 38C64 37 74 39 82 43",
  "M52 52C64 51 74 53 82 57",
  "M52 66C62 65 70 67 78 70",
];

export function PdfBrand({ style }: { style?: Style }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, ...style }}>
      <Svg width={36} height={22} viewBox="14 6 180 112">
        <G fill="none" stroke="#141416" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
          {BOOK.map((d, i) => (
            <Path key={i} d={d} />
          ))}
        </G>
        {PIXELS.map(([x, y, c], i) => (
          <Rect key={i} x={x} y={y} width={13} height={13} fill={c} />
        ))}
      </Svg>
      <Text style={{ marginLeft: 6, fontSize: 14, fontFamily: "Helvetica-Bold", color: "#141416" }}>
        Paper<Text style={{ color: "#0e8796" }}>Punch</Text>
      </Text>
    </View>
  );
}

// Brüche wie 3/4, 12/18 oder (gemischt) 2 1/2 – nicht in Datumsangaben (1/2/2025) oder Einheiten (km/h).
const FRACTION = /(?<![\d/])(\d{1,4})\s*\/\s*(\d{1,4})(?![\d/])/g;

export const hasFraction = (text: string) => new RegExp(FRACTION.source).test(text);

function Fraction({ num, den, fontSize }: { num: string; den: string; fontSize: number }) {
  const small = fontSize * 0.82;
  return (
    <View style={{ flexDirection: "column", alignItems: "center", marginHorizontal: 1.5, marginVertical: 1 }}>
      <Text style={{ fontSize: small, lineHeight: 1 }}>{num}</Text>
      <View style={{ alignSelf: "stretch", borderTop: "0.8pt solid #141416", marginVertical: 1, minWidth: small * 0.9 }} />
      <Text style={{ fontSize: small, lineHeight: 1 }}>{den}</Text>
    </View>
  );
}

/**
 * Text mit Brüchen untereinander. Ohne Bruch bleibt es ein normaler Text (mit normalem Zeilenumbruch);
 * mit Bruch wird die Zeile aus Wörtern und Bruch-Bausteinen zusammengesetzt.
 */
export function MathText({ children, style, fontSize = 11, prefix }: { children: string; style?: Style; fontSize?: number; prefix?: ReactNode }) {
  const text = children ?? "";
  if (!hasFraction(text)) {
    return (
      <Text style={style}>
        {prefix}
        {text}
      </Text>
    );
  }
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  const pushWords = (chunk: string) => {
    for (const word of chunk.split(/(\s+)/)) {
      if (!word) continue;
      if (/^\s+$/.test(word)) parts.push(<Text key={key++} style={{ fontSize }}>{" "}</Text>);
      else parts.push(<Text key={key++} style={{ fontSize }}>{word}</Text>);
    }
  };
  for (const m of text.matchAll(FRACTION)) {
    pushWords(text.slice(last, m.index));
    parts.push(<Fraction key={key++} num={m[1]} den={m[2]} fontSize={fontSize} />);
    last = (m.index ?? 0) + m[0].length;
  }
  pushWords(text.slice(last));
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", ...style }}>
      {prefix ? <Text style={{ fontSize }}>{prefix}</Text> : null}
      {parts}
    </View>
  );
}
