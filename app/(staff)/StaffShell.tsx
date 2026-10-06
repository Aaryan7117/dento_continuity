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
  Settings,
} from "lucide-react";
import { useState } from "react";
import GlobalSearch from "@/app/components/GlobalSearch";
import NotificationCenter from "@/app/components/NotificationCenter";
import ThemeToggle from "@/app/components/ThemeToggle";
import VoiceConsole from "@/app/components/voice/VoiceConsole";
import { signOut } from "@/lib/auth-actions";
import { LogOut } from "lucide-react";

const initials = (name: string) =>
  name.split(/s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const roleLabel = (role: string) =>
  ({ OWNER: "Owner", DENTIST: "Dentist", FRONT_DESK: "Front desk" })[role] ?? role;

const navigation = [
  { name: "Front Desk", href: "/front-desk", icon: Activity },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Settings", href: "/settings", icon: Settings },
];

export type ShellUser = { name: string; role: string; clinicName: string };

export default function StaffShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: ShellUser;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--canvas)" }}>
      {/* Mobile overlay — fades in, not instant */}
      <div
        className={`fixed inset-0 z-40 lg:hidden scrim transition-opacity duration-200 ${
          sidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar — uses --ease-drawer for the slide */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col lg:translate-x-0 lg:static lg:block`}
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--line)",
          transform: sidebarOpen ? "translateX(0)" : undefined,
          transition: "transform 250ms var(--ease-drawer)",
          ...(!sidebarOpen ? { transform: "translateX(-100%)" } : {}),
        }}
        /* On lg+, override the inline transform */
      >
        {/* Logo */}
        <div
          className="h-16 flex items-center justify-between px-5"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <Link href="/front-desk" className="flex items-center gap-2.5 no-press" data-no-press>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "var(--grad-brand)" }}
            >
              D
            </div>
            <span className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
              DENTO
              <span style={{ color: "var(--brand)", fontWeight: 400 }}>Continuity</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-md lg:hidden no-press"
            style={{ color: "var(--ink-faint)" }}
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
                  color: isActive ? "var(--brand)" : "var(--ink-muted)",
                  background: isActive ? "rgb(var(--brand-rgb) / 0.08)" : "transparent",
                  transition:
                    "color 150ms var(--ease-out), background 150ms var(--ease-out)",
                }}
              >
                <item.icon
                  className="w-[18px] h-[18px]"
                  style={{
                    color: isActive ? "var(--brand)" : "var(--ink-faint)",
                    transition: "color 150ms var(--ease-out)",
                  }}
                />
                {item.name}
                {/* Active indicator bar */}
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                  style={{
                    height: isActive ? "20px" : "0px",
                    background: "var(--brand)",
                    opacity: isActive ? 1 : 0,
                    transition:
                      "height 200ms var(--ease-out), opacity 200ms var(--ease-out)",
                  }}
                />
              </Link>
            );
          })}
        </nav>

        {/* Signed-in user */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid var(--line)" }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
              style={{ background: "var(--grad-brand-deep)" }}
            >
              {initials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate" style={{ color: "var(--ink)" }}>
                {user.name}
              </p>
              <p className="text-[11px] truncate" style={{ color: "var(--ink-faint)" }}>
                {roleLabel(user.role)} · {user.clinicName}
              </p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                title="Sign out"
                className="p-1.5 rounded-lg no-press"
                data-no-press
                style={{ color: "var(--ink-faint)" }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
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
              style={{ color: "var(--ink-muted)" }}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Live Global Search */}
            <div className="hidden sm:block flex-1 max-w-md">
              <GlobalSearch />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <VoiceConsole />
            <ThemeToggle />
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
