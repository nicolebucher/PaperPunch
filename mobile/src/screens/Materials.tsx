import { useState } from "react";
import { useT } from "../i18n";
import { Icon, TopBar } from "../ui";
import type { StoredMaterial } from "../storage";
import { materialDate, materialStatus, materialTitle } from "./materialInfo";

/** Alle gespeicherten Lernmaterialien (die letzten 20), mit Weitermachen und Löschen. */
export function Materials({
  materials,
  onOpen,
  onDelete,
  onBack,
}: {
  materials: StoredMaterial[];
  onOpen: (m: StoredMaterial) => void;
  onDelete: (m: StoredMaterial) => void;
  onBack: () => void;
}) {
  const { t, lang } = useT();
  const [editing, setEditing] = useState(false);
  // Eltern mit mehreren Kindern: nach Kind filtern
  const kids = [...new Map(materials.filter((m) => m.childId && m.child).map((m) => [m.childId!, m.child!] as [string, string])).entries()];
  const [kid, setKid] = useState<string | null>(null);
  const shown = kid ? materials.filter((m) => m.childId === kid) : materials;

  return (
    <div className="screen">
      <TopBar
        onBack={onBack}
        right={
          materials.length > 0 ? (
            <button type="button" className="btn ghost small" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
              {editing ? t.doneEditing : t.edit}
            </button>
          ) : undefined
        }
      />
      <div className="stack" style={{ gap: 10, paddingBottom: 28 }}>
        <h1 className="display">{t.myMaterials}</h1>
        <p className="muted" style={{ marginTop: -4 }}>{t.materialsHint}</p>
        {materials.length === 0 && <p className="muted">{t.materialsEmpty}</p>}
        {kids.length > 1 && (
          <div className="kid-chips">
            <button type="button" className={kid === null ? "group-chip on" : "group-chip"} aria-pressed={kid === null} onClick={() => setKid(null)}>{t.childAll}</button>
            {kids.map(([id, name]) => (
              <button key={id} type="button" className={kid === id ? "group-chip on" : "group-chip"} aria-pressed={kid === id} onClick={() => setKid(id)}>{name}</button>
            ))}
          </div>
        )}
        {shown.map((m) => (
          <div key={m.id} className="row" style={{ flexWrap: "nowrap", gap: 8 }}>
            <button type="button" className="material-row" onClick={() => onOpen(m)}>
              <span className="material-icon"><Icon name={m.result.format} size={20} stroke={2.2} /></span>
              <span className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                <span className="material-title">{materialTitle(m)}{m.child && <span className="kid-tag">{m.child}</span>}</span>
                <span className={m.progress && !m.finished ? "material-sub active" : "material-sub"}>
                  {t.formats[m.result.format]} · {materialDate(m, t, lang)} · {materialStatus(m, t)}
                  {m.sources?.length ? ` · ${t.photosCount(m.sources.length)}` : ""}
                </span>
              </span>
              {!editing && <Icon name="chevron" size={18} stroke={2.6} />}
            </button>
            {editing && (
              <button type="button" className="iconbtn" onClick={() => onDelete(m)} aria-label={t.deleteMaterial(materialTitle(m))}>
                <Icon name="close" size={18} stroke={2.6} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
