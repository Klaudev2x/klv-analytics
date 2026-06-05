import React from "react";

interface Page {
  url: string;
  title: string;
  count: number;
}

interface Props {
  pages: Page[];
}

export default function TopPagesTable({ pages }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Top Pages</h3>

      {pages.length === 0 ? (
        <p className="text-slate-500 text-sm">No page views yet</p>
      ) : (
        <div className="space-y-3">
          {pages.map((page, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded hover:bg-slate-800 transition border border-slate-700/50"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {page.title || page.url}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {page.url}
                </div>
              </div>
              <div className="ml-4 px-3 py-1 bg-cyan-500/20 rounded text-cyan-300 text-sm font-medium whitespace-nowrap">
                {page.count}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
