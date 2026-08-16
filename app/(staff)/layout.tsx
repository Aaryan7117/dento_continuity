"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Menu,
  X,
  Activity,
} from "lucide-react";
import { useState } from "react";
import GlobalSearch from "@/app/components/GlobalSearch";
import NotificationCenter from "@/app/components/NotificationCenter";

const navigation = [
  { name: "Front Desk", href: "/front-desk", icon: Activity },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Calendar", href: "/calendar", icon: Calendar },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
      {/* Mobile overlay — fades in, not instant */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-200 ${
          sidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(28, 25, 23, 0.5)", backdropFilter: "blur(4px)" }}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar — uses --ease-drawer for the slide */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col lg:translate-x-0 lg:static lg:block`}
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          transform: sidebarOpen ? "translateX(0)" : undefined,
          transition: "transform 250ms var(--ease-drawer)",
          ...(!sidebarOpen ? { transform: "translateX(-100%)" } : {}),
        }}
        /* On lg+, override the inline transform */
      >
        {/* Logo */}
        <div
          className="h-16 flex items-center justify-between px-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Link href="/front-desk" className="flex items-center gap-2.5 no-press" data-no-press>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #019d8e, #067d73)" }}
            >
              D
            </div>
            <span className="text-[15px] font-semibold" style={{ color: "var(--foreground)" }}>
              DENTO
              <span style={{ color: "#019d8e", fontWeight: 400 }}>Continuity</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-md lg:hidden no-press"
            style={{ color: "var(--text-tertiary)" }}
            data-no-press
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation with sliding active pill */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium relative no-press"
                data-no-press
                style={{
                  color: isActive ? "#019d8e" : "var(--text-secondary)",
                  background: isActive ? "rgba(1, 157, 142, 0.08)" : "transparent",
                  transition:
                    "color 150ms var(--ease-out), background 150ms var(--ease-out)",
                }}
              >
                <item.icon
                  className="w-[18px] h-[18px]"
                  style={{
                    color: isActive ? "#019d8e" : "var(--text-tertiary)",
                    transition: "color 150ms var(--ease-out)",
                  }}
                />
                {item.name}
                {/* Active indicator bar */}
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                  style={{
                    height: isActive ? "20px" : "0px",
                    background: "#019d8e",
                    opacity: isActive ? 1 : 0,
                    transition:
                      "height 200ms var(--ease-out), opacity 200ms var(--ease-out)",
                  }}
                />
              </Link>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer no-press"
            data-no-press
            style={{
              transition: "background 150ms var(--ease-out)",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white"
              style={{ background: "linear-gradient(135deg, #019d8e, #0d524d)" }}
            >
              JS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate" style={{ color: "var(--foreground)" }}>
                Dr. John Smith
              </p>
              <p className="text-[11px] truncate" style={{ color: "var(--text-tertiary)" }}>
                Lead Dentist
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Styles to override transform on large screens */}
      <style>{`
        @media (min-width: 1024px) {
          aside { transform: none !important; }
        }
      `}</style>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header — translucent glass */}
        <header
          className="h-14 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 glass"
        >
          <div className="flex items-center flex-1 gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg lg:hidden no-press"
              data-no-press
              style={{ color: "var(--text-secondary)" }}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Live Global Search */}
            <div className="hidden sm:block flex-1 max-w-md">
              <GlobalSearch />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationCenter />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto section-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
