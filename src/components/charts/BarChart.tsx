import type { ChartPoint } from "../../types";

interface BarChartProps {
  data: ChartPoint[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}

export default function BarChart({
  data,
  height = 200,
  color = "#3B82F6",
  formatValue = (v) => String(v),
}: BarChartProps) {
  const width = 600;
  const padX = 30;
  const padY = 20;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  if (data.length === 0) {
    return <div className="text-sm text-ink-600">Нет данных</div>;
  }

  const max = Math.max(...data.map((d) => d.value));
  const bw = (innerW / data.length) * 0.55;
  const gap = (innerW / data.length) * 0.45;

  const xAt = (i: number) => padX + i * (bw + gap) + gap / 2;
  const hAt = (v: number) => (v / max) * innerH;

  const gridY = [0, 0.5, 1].map((t) => padY + t * innerH);

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
        {data.map((d, i) => {
          const h = hAt(d.value);
          const x = xAt(i);
          const y = padY + innerH - h;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={bw}
                height={h}
                rx={4}
                fill={color}
                opacity={0.9}
              >
                <title>{`${d.label}: ${formatValue(d.value)}`}</title>
              </rect>
              <text
                x={x + bw / 2}
                y={height - 4}
                textAnchor="middle"
                fontSize={11}
                fill="#94A3B8"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
