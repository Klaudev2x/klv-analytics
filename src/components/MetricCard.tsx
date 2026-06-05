import React from "react";

interface Props {
  label: string;
  value: string | number;
  trend?: number;
  icon?: string;
}

export default function MetricCard({ label, value, trend, icon }: Props) {
  const isPositive = trend && trend >= 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition">
      <div className="flex items-start justify-between mb-4">
        <span className="text-slate-400 text-sm font-medium">{label}</span>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-3xl font-bold text-white">{value}</div>
        </div>
        {trend !== undefined && (
          <div
            className={`text-sm font-medium flex items-center gap-1 ${
              isPositive ? "text-green-400" : "text-red-400"
            }`}
          >
            {isPositive ? "↑" : "↓"} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}
