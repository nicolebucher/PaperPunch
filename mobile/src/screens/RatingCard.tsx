import { useState } from "react";
import { useT } from "../i18n";
import { Icon } from "../ui";

/**
 * "Wie fandest du das Material?" – 5 Sterne, danach optional ein Textfeld.
 * Erscheint einmal pro Material; nach dem Senden bleibt ein kurzes Danke stehen.
 */
export function RatingCard({ onSend, onSkip }: { onSend: (stars: number, text: string) => void; onSkip?: () => void }) {
  const { t } = useT();
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="rating-card" role="status">
        <span className="rating-thanks">{t.rateThanks}</span>
      </div>
    );
  }

  return (
    <div className="rating-card">
      <span className="rating-q">{t.rateQuestion}</span>
      <div className="rating-stars" role="radiogroup" aria-label={t.rateQuestion}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={t.rateStars(n)}
            className={n <= stars ? "on" : ""}
            onClick={() => setStars(n)}
          >
            <Icon name="star" size={30} stroke={1.8} filled={n <= stars} />
          </button>
        ))}
      </div>
      {stars > 0 && (
        <div className="stack" style={{ gap: 10, width: "100%" }}>
          <label className="field">
            {stars <= 3 ? t.rateWhatWrong : t.rateWhatGood}
            <textarea className="input" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder={t.rateOptional} />
          </label>
          <button
            type="button"
            className="btn primary block"
            onClick={() => {
              setSent(true);
              onSend(stars, text.trim());
            }}
          >
            {t.rateSend}
          </button>
        </div>
      )}
      {stars === 0 && onSkip && (
        <button type="button" className="link-btn" onClick={onSkip}>{t.rateSkip}</button>
      )}
    </div>
  );
}
