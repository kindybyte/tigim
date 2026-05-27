interface DonutItem {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  items: DonutItem[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

export default function DonutChart({
  items,
  size = 180,
  thickness = 22,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const r = size / 2 - thickness / 2;
  const c = 2 * Math.PI * r;

  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1F2D44"
          strokeWidth={thickness}
        />
        {items.map((item, i) => {
          const portion = item.value / total;
          const len = portion * c;
          const dashArray = `${len} ${c - len}`;
          const dashOffset = -offset;
          offset += len;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={item.color}
              strokeWidth={thickness}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            />
          );
        })}
        {centerValue && (
          <text
            x="50%"
            y="48%"
            textAnchor="middle"
            fontSize="18"
            fontWeight="700"
            fill="#F1F5F9"
          >
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text
            x="50%"
            y="62%"
            textAnchor="middle"
            fontSize="11"
            fill="#64748B"
          >
            {centerLabel}
          </text>
        )}
      </svg>
      <ul className="space-y-2">
        {items.map((item, i) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
              <span className="text-ink-800">{item.label}</span>
              <span className="ml-auto tabular-nums text-ink-600">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
