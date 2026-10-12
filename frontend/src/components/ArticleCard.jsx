import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { SENTIMENT, dateTime, signed } from "../format.js";
import { SentimentBadge } from "./ui.jsx";
import EntityTags from "./EntityTags.jsx";

function ProbBar({ p }) {
  return (
    <div
      className="flex h-1.5 w-20 overflow-hidden bg-stone-100"
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
  const confidence = Number.isFinite(s.confidence) ? s.confidence : Math.max(...Object.values(p));
  const topicKicker = article.entities?.topics?.[0] || article.source || "Market Coverage";

  return (
    <article className="border border-stone-200 bg-white p-4 transition-colors hover:border-stone-900 flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-500 font-sans border-b border-stone-100 pb-2">
          <span className="font-bold uppercase tracking-wider text-stone-900">{topicKicker}</span>
          <span>·</span>
          <span>{dateTime(article.published_at)}</span>
          {article.is_demo && (
            <span className="border border-amber-300 bg-amber-50 px-1 text-[9px] font-bold uppercase tracking-wider text-amber-900">
              Demo data
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            <ProbBar p={p} />
            <SentimentBadge label={s.label} />
            <span
              className="text-[10px] font-semibold text-stone-600"
              title={s.calibrated === false ? "Uncalibrated model score; not a guarantee" : "Model confidence"}
              aria-label={`${(confidence * 100).toFixed(0)}% sentiment confidence${s.calibrated === false ? ", uncalibrated" : ""}`}
            >
              {(confidence * 100).toFixed(0)}% confidence
            </span>
          </span>
        </div>

        <h3 className="mt-2.5 font-serif font-bold text-base sm:text-lg leading-snug text-stone-950">
          {article.url ? (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-1 hover:underline group"
            >
              <span>{article.title}</span>
              <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-black" aria-label="opens original article in a new tab" />
            </a>
          ) : (
            article.title
          )}
        </h3>

        {!compact && article.summary && (
          <p className="mt-2 text-xs leading-relaxed text-stone-700 font-serif">
            {article.summary}
            {ex.summary_basis === "headline_only" && (
              <span className="ml-1 text-[10px] text-stone-400 italic">(headline only: no article text was available)</span>
            )}
          </p>
        )}
      </div>

      {!compact && (
        <div className="mt-4 pt-3 border-t border-stone-100">
          <button
            className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-stone-900 hover:underline"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
            Why this label? Details and entities
          </button>

          {open && (
            <div className="mt-3 space-y-3 border-t border-stone-200 bg-stone-50/60 p-3 text-xs">
              <div>
                <p className="text-stone-600 font-serif">
                  Class probabilities: positive {(p.positive * 100).toFixed(0)}%, neutral {(p.neutral * 100).toFixed(0)}%, negative {(p.negative * 100).toFixed(0)}%
                  {" "}· score <strong>{signed(s.score)}</strong> · model: {s.backend}
                  {s.calibrated === false && " (uncalibrated scores, not probabilities calibrated against observed outcomes)"}
                </p>
                {ex.signals?.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 font-sans">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-stone-500">Signals seen:</span>
                    {ex.signals.map((sg, i) => (
                      <span
                        key={i}
                        className={`chip font-bold text-[10px] ${
                          sg.polarity === "positive"
                            ? "!border-emerald-700 !bg-emerald-50 !text-emerald-900"
                            : "!border-rose-700 !bg-rose-50 !text-rose-900"
                        }`}
                      >
                        {sg.term}
                        {sg.delta !== undefined && ` (${signed(sg.delta, 2)})`}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-stone-500 font-serif italic">
                    No strongly positive or negative finance terms were found, so the label defaults toward neutral.
                  </p>
                )}
                {ex.note && <p className="mt-1.5 text-stone-500 font-serif italic">{ex.note}</p>}
              </div>
              <EntityTags entities={article.entities} />
              {ex.aspects?.length > 0 && (
                <section aria-label="Aspect sentiment">
                  <p className="mb-1 font-bold uppercase tracking-wider text-[10px] text-stone-500">Aspect sentiment</p>
                  <div className="space-y-1.5">
                    {ex.aspects.map((aspect) => (
                      <div key={aspect.aspect} className="flex flex-wrap items-baseline gap-x-2">
                        <strong>{aspect.aspect}:</strong>
                        <span className="capitalize">{aspect.label}</span>
                        <span className="text-stone-500">({signed(aspect.score)})</span>
                        {aspect.evidence?.[0] && <span className="basis-full text-stone-500">{aspect.evidence[0]}</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {ex.events?.length > 0 && (
                <section aria-label="Financial events">
                  <p className="mb-1 font-bold uppercase tracking-wider text-[10px] text-stone-500">Financial events</p>
                  <ul className="space-y-1">
                    {ex.events.map((event, i) => (
                      <li key={`${event.type}-${i}`}>
                        <strong>{event.type}</strong>
                        {event.event_date && <span> · {event.event_date}</span>}
                        <p className="text-stone-500">{event.evidence}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {ex.temporal_references?.length > 0 && (
                <section aria-label="Dates mentioned in article">
                  <p className="mb-1 font-bold uppercase tracking-wider text-[10px] text-stone-500">Dates mentioned</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ex.temporal_references.map((reference, i) => (
                      <span className="chip" key={`${reference.text}-${i}`}>
                        {reference.text} → {reference.date}
                      </span>
                    ))}
                  </div>
                </section>
              )}
              {ex.coverage?.article_count > 1 && (
                <section aria-label="Related coverage">
                  <p className="mb-1 font-bold uppercase tracking-wider text-[10px] text-stone-500">
                    One story · {ex.coverage.article_count} reports · {ex.coverage.sources.join(", ")}
                  </p>
                  <ul className="space-y-1">
                    {ex.coverage.articles.map((related, i) => (
                      <li key={`${related.url || related.title}-${i}`}>
                        {related.url ? (
                          <a className="underline" href={related.url} target="_blank" rel="noopener noreferrer">
                            {related.title}
                          </a>
                        ) : related.title}
                        {related.source && <span className="text-stone-500"> · {related.source}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
