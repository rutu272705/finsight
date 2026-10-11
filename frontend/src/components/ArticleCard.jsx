import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { SENTIMENT, dateTime, signed } from "../format.js";
import { SentimentBadge } from "./ui.jsx";
import EntityTags from "./EntityTags.jsx";

function ProbBar({ p }) {
  return (
    <div
      className="flex h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"
      role="img"
      aria-label={`Positive ${(p.positive * 100).toFixed(0)}%, neutral ${(p.neutral * 100).toFixed(0)}%, negative ${(p.negative * 100).toFixed(0)}%`}
    >
      <i style={{ width: `${p.positive * 100}%`, background: SENTIMENT.positive.hex }} />
      <i style={{ width: `${p.neutral * 100}%`, background: SENTIMENT.neutral.hex }} />
      <i style={{ width: `${p.negative * 100}%`, background: SENTIMENT.negative.hex }} />
    </div>
  );
}

export default function ArticleCard({ article, compact = false, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const s = article.sentiment;
  const ex = article.explanation || {};
  const p = s.probabilities;
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-slate-300">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{article.source || "Unknown source"}</span>
        <span>{dateTime(article.published_at)}</span>
        {article.is_demo && (
          <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800">
            Demo data
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <ProbBar p={p} />
          <SentimentBadge label={s.label} />
        </span>
      </div>
      <h3 className="mt-2 text-[15px] font-semibold leading-snug text-slate-900">
        {article.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-start gap-1.5 transition-colors hover:text-blue-600"
          >
            <span>{article.title}</span>
            <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="opens original article in a new tab" />
          </a>
        ) : (
          article.title
        )}
      </h3>
      {!compact && article.summary && (
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {article.summary}
          {ex.summary_basis === "headline_only" && (
            <span className="ml-1.5 text-xs text-slate-400">(headline only: no article text was available)</span>
          )}
        </p>
      )}
      {!compact && (
        <>
          <button
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden /> Why this label? Details and entities
          </button>
          {open && (
            <div className="mt-3 space-y-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
              <div className="text-xs">
                <p className="text-slate-500">
                  Class probabilities: positive {(p.positive * 100).toFixed(0)}%, neutral {(p.neutral * 100).toFixed(0)}%, negative {(p.negative * 100).toFixed(0)}%
                  {" "}· score {signed(s.score)} · model: {s.backend}
                  {s.calibrated === false && " (heuristic scores, not calibrated probabilities)"}
                </p>
                {ex.signals?.length > 0 ? (
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-slate-700">
                    <span className="font-medium text-slate-500">Signals seen:</span>
                    {ex.signals.map((sg, i) => (
                      <span
                        key={i}
                        className={`chip font-medium ${
                          sg.polarity === "positive"
                            ? "!border-emerald-200 !bg-emerald-50 !text-emerald-800"
                            : "!border-rose-200 !bg-rose-50 !text-rose-800"
                        }`}
                      >
                        {sg.term}
                        {sg.delta !== undefined && ` (${signed(sg.delta, 2)})`}
                      </span>
                    ))}
                  </p>
                ) : (
                  <p className="mt-2 text-slate-400">No strongly positive or negative finance terms were found, so the label defaults toward neutral.</p>
                )}
                {ex.note && <p className="mt-1.5 text-slate-500">{ex.note}</p>}
              </div>
              <EntityTags entities={article.entities} />
            </div>
          )}
        </>
      )}
    </article>
  );
}
