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
  CreditCard,
  BarChart3,
  Stethoscope,
  ChevronDown,
  LogOut,
  ChevronLeft,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import GlobalSearch from "@/app/components/GlobalSearch";
import NotificationCenter from "@/app/components/NotificationCenter";
import ThemeToggle from "@/app/components/ThemeToggle";
import VoiceConsole from "@/app/components/voice/VoiceConsole";
import { signOut } from "@/lib/auth-actions";

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const roleLabel = (role: string) =>
  ({ OWNER: "Owner", DENTIST: "Dentist", FRONT_DESK: "Front desk" })[role] ?? role;

const navigation = [
  { name: "Front Desk", href: "/front-desk", icon: Activity },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Treatments", href: "/patients?tab=treatments", icon: Stethoscope },
  { name: "Billing", href: "/patients?tab=balances", icon: CreditCard },
  { name: "Reports", href: "/dashboard", icon: BarChart3 },
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);

  // Formatted date string matching "Tue, 7 Oct 2026"
  const formattedDate = "Tue, 7 Oct 2026";

  return (
    <div className="min-h-screen flex" style={{ background: "var(--canvas)" }}>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 lg:hidden scrim transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar matching reference image */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[230px] flex flex-col lg:translate-x-0 lg:static lg:block bg-[var(--sidebar-bg)] border-r border-line shadow-xs shrink-0`}
        style={{
          transform: sidebarOpen ? "translateX(0)" : undefined,
          transition: "transform 250ms var(--ease-drawer)",
          ...(!sidebarOpen ? { transform: "translateX(-100%)" } : {}),
        }}
      >
        {/* Logo matching reference: teal rounded square with tooth icon + DENTOContinuity + « collapse */}
        <div className="h-15 flex items-center justify-between px-4 border-b border-line">
          <Link href="/front-desk" className="flex items-center gap-2 no-press" data-no-press>
            <div className="w-7 h-7 rounded-lg bg-teal-600 dark:bg-[#00B8A9] flex items-center justify-center text-white dark:text-[#0A1015] shadow-xs">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-white dark:text-[#0A1015]"
              >
                <path d="M12 2C8.5 2 6 4 6 7.5C6 9.5 7 11 8 13C9 15 9 17 9.5 20C9.8 21.5 11 21.5 11.5 19.5C12 17.5 12 16 12 16C12 16 12 17.5 12.5 19.5C13 21.5 14.2 21.5 14.5 20C15 17 15 15 16 13C17 11 18 9.5 18 7.5C18 4 15.5 2 12 2Z" />
              </svg>
            </div>
            <span className="text-[14px] font-bold tracking-tight text-slate-900 dark:text-[#F4F8FA]">
              DENTO<span className="text-teal-600 dark:text-[#00B8A9] font-normal">Continuity</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Collapse navigation"
              className="hidden lg:flex w-7 h-7 rounded-lg border border-line items-center justify-center text-slate-400 dark:text-[#718295] hover:text-slate-600 dark:hover:text-[#F4F8FA] hover:bg-raised dark:hover:bg-[#152231] transition-colors text-xs font-semibold"
            >
              «
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-md lg:hidden text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              item.href === "/front-desk"
                ? pathname === "/front-desk" || pathname === "/"
                : pathname === item.href || (item.href !== "/front-desk" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all no-press ${
                  isActive
                    ? "bg-teal-50 dark:bg-[rgba(0,184,169,0.12)] dark:border dark:border-[rgba(0,184,169,0.22)] dark:shadow-[0_0_16px_-2px_rgba(0,184,169,0.25)] text-teal-700 dark:text-[#F4F8FA] font-semibold shadow-xs"
                    : "text-slate-600 dark:text-[#A7B7C7] hover:text-slate-900 dark:hover:text-[#F4F8FA] hover:bg-slate-50 dark:hover:bg-[#152231]"
                }`}
                data-no-press
              >
                <item.icon
                  className={`w-[18px] h-[18px] transition-colors ${
                    isActive
                      ? "text-teal-600 dark:text-[#00B8A9]"
                      : "text-slate-400 dark:text-[#718295] group-hover:text-slate-600 dark:group-hover:text-[#A7B7C7]"
                  }`}
                />
                <span className="flex-1">{item.name}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-[#00B8A9] dark:shadow-[0_0_8px_#00B8A9]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile & Promo Card matching reference image */}
        <div className="p-3 space-y-3 border-t border-line">
          {/* Dentist profile card with dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-line bg-surface dark:bg-[#111B25] hover:bg-raised/80 dark:hover:bg-[#152231] transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-teal-700 dark:bg-[#00B8A9] text-white dark:text-[#0A1015] font-bold text-xs flex items-center justify-center shrink-0">
                {initials(user.name || "Dr. Simisola Adeleke")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 dark:text-[#F4F8FA] truncate leading-tight">
                  {user.name || "Dr. Simisola Adeleke"}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-[#718295] truncate">
                  {roleLabel(user.role)}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-[#718295] shrink-0" />
            </button>

            {profileMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-surface dark:bg-[#19283A] border border-line rounded-xl shadow-lg p-1.5 z-50">
                <div className="px-2.5 py-1.5 text-[11px] text-slate-500 dark:text-[#718295] border-b border-line">
                  {user.clinicName || "DENTO Continuity"}
                </div>
                <form action={signOut} className="mt-1">
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-600 dark:text-[#FF5C6C] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Promo Card: Better care, Brighter smiles */}
          <div className="p-3.5 rounded-2xl relative overflow-hidden bg-gradient-to-br from-teal-50 via-teal-100/40 to-emerald-50/50 dark:from-[#111B25] dark:via-[#152231] dark:to-[#111B25] border border-teal-100/80 dark:border-[rgba(160,190,210,0.12)] shadow-xs">
            <div className="relative z-10 pr-6">
              <h4 className="text-[12px] font-bold text-slate-800 dark:text-[#F4F8FA] leading-tight">
                Better care<br />Brighter smiles
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-[#718295] mt-1 leading-snug">
                Streamline your practice with DENTOContinuity
              </p>
            </div>
            <div className="absolute right-2.5 bottom-2.5 w-6 h-6 rounded-full bg-white dark:bg-[#19283A] shadow-xs flex items-center justify-center text-teal-700 dark:text-[#00B8A9] text-xs font-bold border border-teal-100/50 dark:border-[rgba(160,190,210,0.12)]">
              →
            </div>
          </div>
        </div>
      </aside>

      {/* Styles for lg+ transform override */}
      <style>{`
        @media (min-width: 1024px) {
          aside { transform: none !important; }
        }
      `}</style>

      {/* Main workspace area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header matching reference image */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 bg-[var(--topbar-bg)]/95 backdrop-blur-md border-b border-line">
          <div className="flex items-center flex-1 gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg lg:hidden text-slate-500 hover:text-slate-700"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar (pill with Ctrl+K) */}
            <div className="flex-1 max-w-lg">
              <GlobalSearch />
            </div>
          </div>

          {/* Right Header Controls matching reference image: Date Pill, Theme, Notifications, Profile Chip */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Date selector pill */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setDateMenuOpen(!dateMenuOpen)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-line bg-surface dark:bg-[#152231] hover:bg-raised dark:hover:bg-[#19283A] text-xs font-medium text-slate-700 dark:text-[#F4F8FA] transition-colors shadow-2xs"
              >
                <CalendarDays className="w-3.5 h-3.5 text-slate-400 dark:text-[#718295]" />
                <span>{formattedDate}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 dark:text-[#718295]" />
              </button>
            </div>

            {/* Voice Console trigger */}
            <VoiceConsole />

            {/* Theme Toggle (round) */}
            <ThemeToggle />

            {/* Notification Center with badge */}
            <NotificationCenter />

            {/* Header Profile Chip matching reference: DO Dr. Simisola Adeleke Dentist ⌵ */}
            <div className="hidden xl:flex items-center gap-2.5 pl-2 ml-1 border-l border-line">
              <div className="w-8 h-8 rounded-full bg-teal-700 dark:bg-[#00B8A9] text-white dark:text-[#0A1015] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {initials(user.name || "Dr. Simisola Adeleke")}
              </div>
              <div className="text-left">
                <p className="text-[12px] font-semibold text-slate-800 dark:text-[#F4F8FA] leading-tight">
                  {user.name || "Dr. Simisola Adeleke"}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-[#718295] leading-tight">
                  {roleLabel(user.role)}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-[#718295]" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          <div className="max-w-[1536px] mx-auto section-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
