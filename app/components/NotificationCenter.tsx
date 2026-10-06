"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Sparkles, UserX, Clock, Check, X, ArrowRight, ShieldAlert, MessageSquareReply } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import type { NotificationItem } from "@/lib/notifications";

// Read and dismissed state is a per-browser convenience; the items themselves
// come from live records and vanish when their cause is resolved.
const READ_KEY = "dento.notifications.read";
const DISMISSED_KEY = "dento.notifications.dismissed";
const REFRESH_MS = 60_000;

function loadIds(key: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(raw) ? raw.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function saveIds(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Private windows and blocked storage: the state just lasts for this page.
  }
}

export default function NotificationCenter() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  // Safe to read during the first render: nothing is shown until the list has
  // been fetched, so the server and browser output still match.
  const [readIds, setReadIds] = useState<string[]>(() => loadIds(READ_KEY));
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => loadIds(DISMISSED_KEY));
  const containerRef = useRef<HTMLDivElement>(null);

  const notifications = items
    .filter((n) => !dismissedIds.includes(n.id))
    .map((n) => ({ ...n, read: readIds.includes(n.id) }));
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Refetched on navigation as well as on a timer, so approving a draft or
  // flagging a no-show is reflected without a manual reload.
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/notifications")
        .then((r) => (r.ok ? r.json() : []))
        .then((data: NotificationItem[]) => {
          if (!cancelled && Array.isArray(data)) setItems(data);
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function remember(key: string, ids: string[], set: (ids: string[]) => void) {
    // Only ids still on the list are kept, so the stored set cannot grow forever.
    const live = ids.filter((id) => items.some((n) => n.id === id));
    set(live);
    saveIds(key, live);
  }

  function markAllRead() {
    remember(READ_KEY, items.map((n) => n.id), setReadIds);
    toast.success("All notifications marked as read");
  }

  function dismissNotification(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    remember(DISMISSED_KEY, [...dismissedIds, id], setDismissedIds);
  }

  function markItemRead(id: string) {
    remember(READ_KEY, [...readIds, id], setReadIds);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-raised transition-colors"
        title="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white text-[9px] font-bold text-white"
          />
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl z-50 overflow-hidden border border-line"
          style={{
            background: "var(--surface)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/12 text-red-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-semibold text-brand hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-line">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-ink-faint">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold">No notifications right now</p>
              </div>
            ) : (
              notifications.map((item) => {
                let icon = <Bell className="w-4 h-4 text-ink-muted" />;
                let iconBg = "bg-raised";

                if (item.type === "RECOMMENDATION") {
                  icon = <Sparkles className="w-4 h-4 text-amber-600" />;
                  iconBg = "bg-amber-500/12";
                } else if (item.type === "NO_SHOW") {
                  icon = <UserX className="w-4 h-4 text-red-600" />;
                  iconBg = "bg-red-500/12";
                } else if (item.type === "RECALL") {
                  icon = <Clock className="w-4 h-4 text-brand" />;
                  iconBg = "bg-brand/12";
                } else if (item.type === "PATIENT") {
                  icon = <MessageSquareReply className="w-4 h-4 text-brand" />;
                  iconBg = "bg-brand/12";
                } else if (item.type === "BILLING") {
                  icon = <ShieldAlert className="w-4 h-4 text-emerald-600" />;
                  iconBg = "bg-emerald-500/12";
                }

                return (
                  <Link
                    key={item.id}
                    href={item.link}
                    onClick={() => markItemRead(item.id)}
                    className={`flex items-start gap-3 p-3.5 hover:bg-canvas/80 transition-colors group relative ${
                      !item.read ? "bg-canvas/40" : ""
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${iconBg}`}>{icon}</div>
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-ink block truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-ink-faint shrink-0">
                          {formatDistanceToNowStrict(new Date(item.at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    <button
                      onClick={(e) => dismissNotification(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-ink-faint hover:text-ink-muted rounded transition-opacity absolute right-2 top-3"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {!item.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand absolute right-2.5 top-1/2 -translate-y-1/2" />
                    )}
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-canvas/50 border-t border-line text-center">
            <Link
              href="/front-desk"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-brand hover:underline inline-flex items-center gap-1"
            >
              View all actions on Front Desk <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
