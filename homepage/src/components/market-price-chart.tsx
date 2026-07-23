"use client";

import { LineChart } from "lucide-react";
import { useMemo, useState } from "react";

type PricePoint = {
  month: string;
  averagePricePerPing: number | null;
  transactions: number;
};

const chartWidth = 980;
const chartHeight = 330;
const padding = {
  top: 26,
  right: 30,
  bottom: 48,
  left: 56,
};

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${year}/${Number(monthNumber)}`;
}

function getX(index: number, length: number) {
  const innerWidth = chartWidth - padding.left - padding.right;

  if (length <= 1) {
    return padding.left;
  }

  return padding.left + (index / (length - 1)) * innerWidth;
}

function getNearestPointIndex(clientX: number, svg: SVGSVGElement, length: number) {
  const rect = svg.getBoundingClientRect();
  const relativeX = ((clientX - rect.left) / rect.width) * chartWidth;
  const innerWidth = chartWidth - padding.left - padding.right;
  const clampedX = Math.min(Math.max(relativeX, padding.left), chartWidth - padding.right);
  const ratio = (clampedX - padding.left) / innerWidth;

  return Math.min(length - 1, Math.max(0, Math.round(ratio * (length - 1))));
}

export function MarketPriceChart({ data }: { data: PricePoint[] }) {
  const [activeIndex, setActiveIndex] = useState(data.length - 1);
  const chart = useMemo(() => {
    const values = data
      .map((item) => item.averagePricePerPing)
      .filter((value): value is number => typeof value === "number");
    const min = Math.floor(Math.min(...values));
    const max = Math.ceil(Math.max(...values));
    const yRange = max - min || 1;
    const innerHeight = chartHeight - padding.top - padding.bottom;
    const path = data
      .map((item, index) => {
        const value = item.averagePricePerPing ?? min;
        const x = getX(index, data.length);
        const y = padding.top + (1 - (value - min) / yRange) * innerHeight;

        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");

    return {
      min,
      max,
      yRange,
      innerHeight,
      path,
    };
  }, [data]);
  const active = data[activeIndex] ?? data.at(-1);
  const activeValue = active?.averagePricePerPing ?? chart.min;
  const activeX = getX(activeIndex, data.length);
  const activeY =
    padding.top + (1 - (activeValue - chart.min) / chart.yRange) * chart.innerHeight;

  return (
    <figure className="market-chart-card">
      <figcaption>
        <span className="market-chart-icon">
          <LineChart size={19} aria-hidden="true" />
        </span>
        <div>
          <h3>高雄市房屋平均單價</h3>
          <p>
            滑動或移動滑鼠查看每月統計；目前選取{" "}
            <strong>
              {active ? formatMonth(active.month) : "-"}：{active?.averagePricePerPing ?? "-"}{" "}
              萬元/坪
            </strong>
          </p>
        </div>
      </figcaption>
      <div className="market-price-summary" aria-live="polite">
        <span>{active ? formatMonth(active.month) : "-"}</span>
        <strong>{active?.averagePricePerPing ?? "-"} 萬元/坪</strong>
        <small>{active?.transactions ?? 0} 筆房屋交易樣本</small>
      </div>
      <svg
        className="market-chart interactive-price-chart"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label="高雄市房屋平均單價互動線圖"
        onMouseMove={(event) => setActiveIndex(getNearestPointIndex(event.clientX, event.currentTarget, data.length))}
        onTouchMove={(event) => {
          const touch = event.touches[0];

          if (touch) {
            setActiveIndex(getNearestPointIndex(touch.clientX, event.currentTarget, data.length));
          }
        }}
      >
        <line
          x1={padding.left}
          x2={chartWidth - padding.right}
          y1={chartHeight - padding.bottom}
          y2={chartHeight - padding.bottom}
          className="chart-axis"
        />
        <line
          x1={padding.left}
          x2={padding.left}
          y1={padding.top}
          y2={chartHeight - padding.bottom}
          className="chart-axis"
        />
        {[0, 0.5, 1].map((ratio) => {
          const y = padding.top + ratio * chart.innerHeight;
          const label = (chart.max - ratio * chart.yRange).toFixed(0);

          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                x2={chartWidth - padding.right}
                y1={y}
                y2={y}
                className="chart-grid-line"
              />
              <text x={padding.left - 10} y={y + 4} className="chart-y-label">
                {label}
              </text>
            </g>
          );
        })}
        {data
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.month.endsWith("-01") && Number(item.month.slice(0, 4)) % 2 === 1)
          .map(({ item, index }) => (
            <text
              className="chart-x-label"
              key={item.month}
              x={getX(index, data.length)}
              y={chartHeight - 16}
            >
              {item.month.slice(0, 4)}
            </text>
          ))}
        <path
          className="price-area"
          d={`${chart.path} L ${getX(data.length - 1, data.length)} ${chartHeight - padding.bottom} L ${padding.left} ${chartHeight - padding.bottom} Z`}
        />
        <path className="price-line" d={chart.path} />
        <line
          x1={activeX}
          x2={activeX}
          y1={padding.top}
          y2={chartHeight - padding.bottom}
          className="chart-crosshair"
        />
        <circle cx={activeX} cy={activeY} r="6" className="chart-active-dot" />
        <g transform={`translate(${Math.min(activeX + 12, chartWidth - 205)} ${Math.max(activeY - 54, padding.top)})`}>
          <rect width="190" height="42" rx="10" className="chart-tooltip-box" />
          <text x="12" y="17" className="chart-tooltip-title">
            {active ? formatMonth(active.month) : "-"}
          </text>
          <text x="12" y="32" className="chart-tooltip-value">
            {active?.averagePricePerPing ?? "-"} 萬元/坪
          </text>
        </g>
      </svg>
      <label className="market-chart-slider-label">
        選擇月份
        <input
          className="market-chart-slider"
          type="range"
          min={0}
          max={data.length - 1}
          value={activeIndex}
          onChange={(event) => setActiveIndex(Number(event.target.value))}
          aria-label="選擇平均單價月份"
        />
      </label>
    </figure>
  );
}
