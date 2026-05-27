import type { ChartPoint } from "../../types";

interface LineChartProps {
  data: ChartPoint[];
  height?: number;
  color?: string;
  fill?: string;
  formatValue?: (v: number) => string;
}

export default function LineChart({
  data,
  height = 200,
  color = "#60A5FA",
  fill = "rgba(96, 165, 250, 0.16)",
  formatValue = (v) => String(v),
}: LineChartProps) {
  const width = 600;
  const padX = 36;
  const padY = 20;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  if (data.length === 0) {
    return <div className="text-sm text-ink-600">Нет данных</div>;
  }

  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = Math.max(1, max - min);

  const xAt = (i: number) => padX + (i * innerW) / Math.max(1, data.length - 1);
  const yAt = (v: number) => padY + innerH - ((v - min) / range) * innerH;

  const points = data.map((d, i) => `${xAt(i)},${yAt(d.value)}`).join(" ");
  const areaPath = `M ${xAt(0)},${padY + innerH} L ${points
    .split(" ")
    .join(" L ")} L ${xAt(data.length - 1)},${padY + innerH} Z`;

  // 4 gridlines
  const gridY = [0, 0.25, 0.5, 0.75, 1].map((t) => padY + t * innerH);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="none">
        {gridY.map((y, i) => (
          <line
            key={i}
            x1={padX}
            x2={width - padX}
            y1={y}
            y2={y}
            stroke="#1F2D44"
            strokeWidth={1}
          />
        ))}
        <path d={areaPath} fill={fill} />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={xAt(i)}
              cy={yAt(d.value)}
              r={3.5}
              fill="#16243A"
              stroke={color}
              strokeWidth={2}
            />
            <title>{`${d.label}: ${formatValue(d.value)}`}</title>
          </g>
        ))}
        {data.map((d, i) => (
          <text
            key={`l-${i}`}
            x={xAt(i)}
            y={height - 4}
            textAnchor="middle"
            fontSize={11}
            fill="#94A3B8"
          >
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
