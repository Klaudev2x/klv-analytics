import React from "react";

interface Event {
  id?: string;
  event_type?: string;
  eventType?: string;
  page_url?: string;
  pageUrl?: string;
  error_message?: string;
  errorMessage?: string;
  created_at?: string;
  createdAt?: string;
}

interface Props {
  title: string;
  events: Event[];
  maxItems?: number;
}

export default function ActivityFeed({
  title,
  events,
  maxItems = 10,
}: Props) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case "page_view":
        return "📄";
      case "api_call":
        return "🔌";
      case "error":
        return "❌";
      case "session_start":
        return "▶️";
      case "session_end":
        return "⏹️";
      default:
        return "•";
    }
  };

  const getEventLabel = (event: Event) => {
    const type = event.event_type || event.eventType;
    const url = event.page_url || event.pageUrl;
    const error = event.error_message || event.errorMessage;

    if (error) return error.substring(0, 60);
    if (url) return url;
    return type;
  };

  const getEventTime = (event: Event) => {
    const timestamp = event.created_at || event.createdAt;
    if (!timestamp) return "now";

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-6">{title}</h3>

      {events.length === 0 ? (
        <p className="text-slate-500 text-sm">No events yet</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.slice(0, maxItems).map((event, idx) => (
            <div
              key={event.id || idx}
              className="flex items-start gap-3 p-3 bg-slate-800/50 rounded hover:bg-slate-800 transition border border-slate-700/50 text-sm"
            >
              <span className="text-lg flex-shrink-0">
                {getEventIcon(event.event_type || event.eventType)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-slate-300 truncate">
                  {getEventLabel(event)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {getEventTime(event)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
