import React from "react";

interface TrafficDataPoint {
  time: string;
  views: number;
}

interface Props {
  data: TrafficDataPoint[];
}

export default function TrafficChart({ data }: Props) {
  const maxViews = Math.max(...data.map((d) => d.views), 1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Traffic Last 24 Hours</h3>

      <div className="space-y-4">
        <div className="flex items-end gap-2 h-64">
          {data.map((point, idx) => {
            const heightPercent = (point.views / maxViews) * 100 || 5;
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center group"
              >
                <div className="relative w-full h-full flex flex-col justify-end">
                  <div
                    className="w-full bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t opacity-80 hover:opacity-100 transition group-hover:from-cyan-400 group-hover:to-cyan-300"
                    style={{ height: `${heightPercent}%` }}
                    title={`${point.views} views`}
                  />
                </div>
                <span className="text-xs text-slate-400 mt-2 group-hover:text-slate-200 transition">
                  {point.time}
                </span>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-slate-700 text-xs text-slate-500">
          <p>Highest: {Math.max(...data.map((d) => d.views))} views</p>
          <p>
            Average:{" "}
            {Math.round(data.reduce((sum, d) => sum + d.views, 0) / data.length)}{" "}
            views
          </p>
        </div>
      </div>
    </div>
  );
}
