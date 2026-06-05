import { useEffect, useState } from "react";
import { supabase } from "../lib/analytics";

interface SeoPage {
  id: string;
  page_url: string;
  page_title: string | null;
  meta_description: string | null;
  h1_count: number;
  has_meta_description: boolean;
  has_og_tags: boolean;
  has_canonical: boolean;
  word_count: number;
  internal_links: number;
  external_links: number;
  last_crawled_at: string | null;
}

interface SeoScore {
  total: number;
  passed: number;
  warnings: number;
  failed: number;
}

interface Props {
  siteId: string;
}

export default function SeoTab({ siteId }: Props) {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeo();
  }, [siteId]);

  const loadSeo = async () => {
    try {
      const { data } = await supabase
        .from("analytics_seo_pages")
        .select("*")
        .eq("site_id", siteId)
        .order("last_crawled_at", { ascending: false, nullsFirst: true });

      setPages((data || []) as SeoPage[]);
      setLoading(false);
    } catch (err) {
      console.error("SEO tab error:", err);
      setLoading(false);
    }
  };

  const getScore = (page: SeoPage): SeoScore => {
    let total = 6;
    let passed = 0;
    let warnings = 0;
    let failed = 0;

    if (page.page_title) passed++; else failed++;
    if (page.has_meta_description) passed++; else failed++;
    if (page.h1_count === 1) passed++; else if (page.h1_count === 0) failed++; else warnings++;
    if (page.has_og_tags) passed++; else warnings++;
    if (page.has_canonical) passed++; else warnings++;
    if (page.word_count >= 300) passed++; else if (page.word_count >= 100) warnings++; else failed++;

    return { total, passed, warnings, failed };
  };

  const scoreColor = (score: SeoScore) => {
    const pct = score.passed / score.total;
    if (pct >= 0.8) return "text-emerald-400";
    if (pct >= 0.5) return "text-amber-400";
    return "text-red-400";
  };

  const scoreBg = (score: SeoScore) => {
    const pct = score.passed / score.total;
    if (pct >= 0.8) return "bg-emerald-500";
    if (pct >= 0.5) return "bg-amber-500";
    return "bg-red-500";
  };

  if (loading) return <div className="text-slate-400">Loading SEO data...</div>;

  // Overall site score
  const allScores = pages.map((p) => getScore(p));
  const avgScore = allScores.length > 0
    ? Math.round((allScores.reduce((s, sc) => s + sc.passed, 0) / (allScores.length * 6)) * 100)
    : 0;

  const totalIssues = allScores.reduce((s, sc) => s + sc.failed + sc.warnings, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <span className="text-slate-400 text-sm">Overall SEO Score</span>
          <div className="flex items-center gap-4 mt-2">
            <div className={`text-4xl font-bold ${avgScore >= 80 ? "text-emerald-400" : avgScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
              {pages.length > 0 ? avgScore : "--"}
            </div>
            {pages.length > 0 && (
              <div className="flex-1">
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${avgScore >= 80 ? "bg-emerald-500" : avgScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${avgScore}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <span className="text-slate-400 text-sm">Pages Crawled</span>
          <div className="text-3xl font-bold text-white mt-2">{pages.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <span className="text-slate-400 text-sm">Issues Found</span>
          <div className={`text-3xl font-bold mt-2 ${totalIssues > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {totalIssues}
          </div>
        </div>
      </div>

      {/* SEO recommendations */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">SEO Recommendations</h3>
        <div className="space-y-3">
          {pages.filter((p) => !p.has_meta_description).length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
              <span className="text-amber-400 mt-0.5">!</span>
              <div>
                <div className="text-amber-200 text-sm font-medium">Missing meta descriptions</div>
                <div className="text-amber-300/70 text-xs">{pages.filter((p) => !p.has_meta_description).length} pages missing meta descriptions. Add unique descriptions for better CTR in search results.</div>
              </div>
            </div>
          )}
          {pages.filter((p) => p.h1_count === 0).length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
              <span className="text-red-400 mt-0.5">!</span>
              <div>
                <div className="text-red-200 text-sm font-medium">Missing H1 tags</div>
                <div className="text-red-300/70 text-xs">{pages.filter((p) => p.h1_count === 0).length} pages have no H1 heading. Each page should have exactly one H1.</div>
              </div>
            </div>
          )}
          {pages.filter((p) => p.h1_count > 1).length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
              <span className="text-amber-400 mt-0.5">!</span>
              <div>
                <div className="text-amber-200 text-sm font-medium">Multiple H1 tags</div>
                <div className="text-amber-300/70 text-xs">{pages.filter((p) => p.h1_count > 1).length} pages have multiple H1 tags. Use only one H1 per page.</div>
              </div>
            </div>
          )}
          {pages.filter((p) => p.word_count < 300).length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
              <span className="text-amber-400 mt-0.5">!</span>
              <div>
                <div className="text-amber-200 text-sm font-medium">Thin content</div>
                <div className="text-amber-300/70 text-xs">{pages.filter((p) => p.word_count < 300).length} pages have less than 300 words. Consider adding more content for better SEO.</div>
              </div>
            </div>
          )}
          {pages.filter((p) => !p.has_og_tags).length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-slate-800/50 border border-slate-700/50 rounded">
              <span className="text-slate-400 mt-0.5">i</span>
              <div>
                <div className="text-slate-200 text-sm font-medium">Missing Open Graph tags</div>
                <div className="text-slate-400 text-xs">{pages.filter((p) => !p.has_og_tags).length} pages lack OG tags. These improve social media sharing previews.</div>
              </div>
            </div>
          )}
          {totalIssues === 0 && pages.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded">
              <span className="text-emerald-400 mt-0.5">+</span>
              <div>
                <div className="text-emerald-200 text-sm font-medium">Looking good!</div>
                <div className="text-emerald-300/70 text-xs">No major SEO issues detected. Keep monitoring regularly.</div>
              </div>
            </div>
          )}
          {pages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-2">No SEO data yet.</p>
              <p className="text-slate-500 text-xs">Install the KLV tracker and crawl your site to see SEO insights.</p>
            </div>
          )}
        </div>
      </div>

      {/* Page-by-page breakdown */}
      {pages.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Page Scores</h3>
          <div className="space-y-3">
            {pages.map((page) => {
              const score = getScore(page);
              return (
                <div key={page.id} className="p-4 bg-slate-800/50 rounded border border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm truncate">{page.page_title || "Untitled"}</div>
                      <div className="text-xs text-slate-400 truncate font-mono">{page.page_url}</div>
                    </div>
                    <div className="ml-4 flex items-center gap-3">
                      <span className={`text-sm font-bold ${scoreColor(score)}`}>
                        {score.passed}/{score.total}
                      </span>
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBg(score)}`}
                          style={{ width: `${(score.passed / score.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {!page.has_meta_description && <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">No meta</span>}
                    {page.h1_count === 0 && <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">No H1</span>}
                    {page.h1_count > 1 && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded">Multiple H1</span>}
                    {!page.has_og_tags && <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">No OG tags</span>}
                    {!page.has_canonical && <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">No canonical</span>}
                    {page.word_count < 300 && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded">Thin content ({page.word_count}w)</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
