import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SENTIMENT } from "../format.js";

export default function SentimentDonut({ distribution }) {
  const data = ["positive", "neutral", "negative"].map((key) => ({
    key,
    name: SENTIMENT[key].label,
    value: distribution[key] || 0,
  }));
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex items-center gap-4">
      <div className="h-28 w-28 shrink-0" role="img" aria-label={`Sentiment distribution: ${data.map((item) => `${item.value} ${item.name.toLowerCase()}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={30} outerRadius={50} paddingAngle={total > 0 ? 2 : 0} stroke="#ffffff" strokeWidth={1.5} isAnimationActive={false}>
              {data.map((item) => (
                <Cell key={item.key} fill={SENTIMENT[item.key].hex} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#ffffff", border: "1px solid #1c1917", borderRadius: 0, fontSize: 11, fontFamily: "sans-serif" }}
              itemStyle={{ color: "#1c1917", fontWeight: 700 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1.5 text-xs font-serif divide-y divide-stone-100 flex-1">
        {data.map((item) => (
          <li key={item.key} className="flex items-center justify-between pt-1 font-serif">
            <span className="flex items-center gap-1.5">
              <i className="h-2 w-2 shrink-0" style={{ background: SENTIMENT[item.key].hex }} />
              <span className="text-stone-700">{item.name}</span>
            </span>
            <span className="font-sans font-bold text-stone-950">
              {item.value} <span className="text-stone-400 font-normal text-[10px]">({total ? `${Math.round((item.value / total) * 100)}%` : "0%"})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}