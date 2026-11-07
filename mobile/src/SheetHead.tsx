import { useRef, type ReactNode } from "react";
import { Icon } from "./ui";
import { useT } from "./i18n";
import { useBackClose } from "./backStack";

/**
 * Kopf für Bottom-Sheets: Griff zum Herunterwischen, ✕ zum Schließen, Android-Zurück schließt das Sheet.
 * Wischen: am Griff/Kopf nach unten ziehen – ab 90 px schließt das Sheet (das Sheet folgt dem Finger).
 */
export function SheetHead({ onClose, children }: { onClose: () => void; children?: ReactNode }) {
  const { t } = useT();
  useBackClose(true, onClose);
  const start = useRef<number | null>(null);
  const sheetOf = (el: HTMLElement) => el.closest(".sheet") as HTMLElement | null;

  return (
    <div
      className="sh-head"
      onTouchStart={(e) => {
        start.current = e.touches[0].clientY;
      }}
      onTouchMove={(e) => {
        if (start.current === null) return;
        const dy = Math.max(0, e.touches[0].clientY - start.current);
        const s = sheetOf(e.currentTarget);
        if (s) {
          s.style.transition = "none";
          s.style.transform = `translateY(${dy}px)`;
        }
      }}
      onTouchEnd={(e) => {
        const s = sheetOf(e.currentTarget);
        const dy = start.current === null ? 0 : e.changedTouches[0].clientY - start.current;
        start.current = null;
        if (dy > 90) onClose();
        else if (s) {
          s.style.transition = "transform .2s ease";
          s.style.transform = "";
        }
      }}
    >
      <span className="sh-grab" aria-hidden="true" />
      <div className="sh-row">
        <div className="sh-title">{children}</div>
        <button type="button" className="sh-close" onClick={onClose} aria-label={t.close}>
          <Icon name="close" size={18} stroke={2.6} />
        </button>
      </div>
    </div>
  );
}
