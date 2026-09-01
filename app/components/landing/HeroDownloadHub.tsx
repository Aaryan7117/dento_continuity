"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Info,
  Laptop,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";

export function WindowsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.801" />
    </svg>
  );
}

export function AppleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 170 170" className={className} fill="currentColor" aria-hidden>
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.75-7.85-12.16-14.42-7.85-11.75-14.05-25.04-18.6-39.88-4.55-14.83-6.83-28.72-6.83-41.67 0-16.76 4.35-30.82 13.06-42.18 8.71-11.36 19.64-17.15 32.79-17.38 4.89 0 10.45 1.25 16.68 3.75 6.23 2.5 10.23 3.75 12 3.75 1.52 0 5.48-1.25 11.87-3.75 6.39-2.5 11.8-3.75 16.24-3.75 12.39.22 22.84 4.89 31.36 14 5.43 5.87 9.57 12.83 12.4 20.88-10.87 6.53-16.2 15.66-16 27.4.22 9.13 3.69 16.85 10.43 23.16 6.74 6.3 14.67 9.89 23.8 10.76-2.61 7.83-6.19 16.09-10.74 24.78zM119.22 31.85c0-7.83 2.83-15.33 8.48-22.5 5.65-7.18 12.83-11.63 21.52-13.35.22 1.09.33 2.07.33 2.93 0 7.83-2.93 15.43-8.8 22.82-5.87 7.4-13.05 11.74-21.53 13.04-.22-1-.33-1.98-.33-2.94z" />
    </svg>
  );
}

const GITHUB_REPO_URL = "https://github.com/Aaryan7117/dento_continuity";
const RELEASES_URL = `${GITHUB_REPO_URL}/releases/latest`;
const ACTIONS_URL = `${GITHUB_REPO_URL}/actions`;

export default function HeroDownloadHub() {
  const [detectedOS, setDetectedOS] = useState<"mac" | "win" | "other">("win");
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes("mac") || ua.includes("darwin") || ua.includes("iphone") || ua.includes("ipad")) {
      setDetectedOS("mac");
    } else {
      setDetectedOS("win");
    }
  }, []);

  const copyGatekeeperCmd = () => {
    navigator.clipboard.writeText("xattr -cr /Applications/DENTO\\ Continuity.app");
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div className="mt-8">
      {/* Primary Dual Download Buttons with Professional OS Badges */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {/* Windows Download Button */}
        <a
          href={RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`group relative flex flex-1 items-center justify-between gap-3.5 rounded-xl border px-4 py-3 transition-all duration-300 ${
            detectedOS === "win"
              ? "border-[var(--champagne)]/70 bg-gradient-to-br from-[var(--champagne)]/20 via-white/[0.06] to-black/40 shadow-[0_0_28px_rgba(216,184,104,0.22)] ring-1 ring-[var(--champagne)]/30 hover:border-[var(--champagne)]"
              : "border-white/12 bg-white/[0.035] hover:border-white/30 hover:bg-white/[0.07]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                detectedOS === "win"
                  ? "border-[var(--champagne)]/40 bg-[var(--champagne)]/15 text-[var(--champagne)] shadow-[0_0_12px_rgba(216,184,104,0.3)]"
                  : "border-white/12 bg-white/[0.05] text-white/70 group-hover:text-white"
              }`}
            >
              <WindowsIcon className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-semibold tracking-tight text-white">
                  Windows
                </span>
                <span className="rounded-[4px] border border-[var(--champagne)]/35 bg-[var(--champagne)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--champagne)]">
                  .exe
                </span>
                {detectedOS === "win" && (
                  <span className="hidden rounded-full bg-[var(--jade)]/20 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--jade)] sm:inline-block">
                    Detected
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-white/55">
                Windows 10 / 11 · 64-bit
              </p>
            </div>
          </div>
          <ArrowDownToLine className="h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 group-hover:translate-y-0.5 group-hover:text-[var(--champagne)]" />
        </a>

        {/* macOS Download Button */}
        <a
          href={RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`group relative flex flex-1 items-center justify-between gap-3.5 rounded-xl border px-4 py-3 transition-all duration-300 ${
            detectedOS === "mac"
              ? "border-[var(--champagne)]/70 bg-gradient-to-br from-[var(--champagne)]/20 via-white/[0.06] to-black/40 shadow-[0_0_28px_rgba(216,184,104,0.22)] ring-1 ring-[var(--champagne)]/30 hover:border-[var(--champagne)]"
              : "border-white/12 bg-white/[0.035] hover:border-white/30 hover:bg-white/[0.07]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                detectedOS === "mac"
                  ? "border-[var(--champagne)]/40 bg-[var(--champagne)]/15 text-[var(--champagne)] shadow-[0_0_12px_rgba(216,184,104,0.3)]"
                  : "border-white/12 bg-white/[0.05] text-white/70 group-hover:text-white"
              }`}
            >
              <AppleIcon className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-semibold tracking-tight text-white">
                  macOS
                </span>
                <span className="rounded-[4px] border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/90">
                  .dmg
                </span>
                {detectedOS === "mac" && (
                  <span className="hidden rounded-full bg-[var(--jade)]/20 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--jade)] sm:inline-block">
                    Detected
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-white/55">
                Apple Silicon &amp; Intel
              </p>
            </div>
          </div>
          <ArrowDownToLine className="h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 group-hover:translate-y-0.5 group-hover:text-[var(--champagne)]" />
        </a>

        {/* Live Web Demo Button */}
        <Link
          href="/front-desk"
          className="btn-glass group inline-flex h-auto items-center justify-center gap-2.5 rounded-xl border border-white/12 px-5 py-3 text-[13px] font-medium text-white/90 transition-all hover:border-[var(--champagne)]/40 hover:text-white sm:w-auto"
        >
          <Sparkles className="h-4 w-4 text-[var(--champagne)]" />
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span>Web Studio</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <p className="text-[10.5px] text-white/45">No install needed</p>
          </div>
        </Link>
      </div>

      {/* Trust & Architecture Metadata Bar */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-y-2 text-[11.5px] text-white/55">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--jade)] animate-pulse" />
          <span>v0.1.0 Stable · Realtime Supabase PostgreSQL Sync</span>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1 text-[11.5px] text-[var(--champagne)] hover:underline hover:text-white transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
          Installation &amp; Gatekeeper Guide
        </button>
      </div>

      {/* Installation & Architecture Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-2xl border border-white/15 bg-[#0e1011] p-6 text-white shadow-2xl">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 text-[var(--champagne)]">
              <ShieldCheck className="h-5 w-5" />
              <h3 className="text-base font-semibold">Desktop Installation Guide</h3>
            </div>
            <p className="mt-1 text-xs text-white/60">
              DENTO Continuity is an enterprise desktop workstation with embedded SQLite + live cloud database replication.
            </p>

            <div className="mt-5 space-y-4 text-xs">
              {/* Windows Section */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <WindowsIcon className="h-4 w-4 text-[var(--champagne)]" />
                    <span>Windows 10 / 11 (x64)</span>
                  </div>
                  <a
                    href={RELEASES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--champagne)] hover:underline"
                  >
                    Download .exe <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="mt-2 text-white/70 leading-relaxed">
                  Download and run <code className="rounded bg-white/10 px-1 py-0.5 text-[11px] text-[var(--champagne)]">DENTO Continuity.exe</code>. If Windows SmartScreen displays a warning, click <strong>&quot;More info&quot;</strong> → <strong>&quot;Run anyway&quot;</strong>.
                </p>
              </div>

              {/* Mac Section */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <AppleIcon className="h-4 w-4 text-white" />
                    <span>macOS Monterey, Ventura, Sonoma, Sequoia</span>
                  </div>
                  <a
                    href={RELEASES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--champagne)] hover:underline"
                  >
                    Download .dmg <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="mt-2 text-white/70 leading-relaxed">
                  Drag the app into your <code className="rounded bg-white/10 px-1 py-0.5 text-[11px]">Applications</code> folder. On first launch, macOS Gatekeeper may prompt verification. Run this command in Terminal to bypass:
                </p>
                <div className="mt-2.5 flex items-center justify-between rounded-lg bg-black/60 px-3 py-2 font-mono text-[11px] text-[var(--champagne)]">
                  <code>xattr -cr /Applications/DENTO\ Continuity.app</code>
                  <button
                    type="button"
                    onClick={copyGatekeeperCmd}
                    className="ml-2 inline-flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[10px] text-white hover:bg-white/20 transition-colors"
                  >
                    {copied ? <Check className="h-3 w-3 text-[var(--jade)]" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* CI / Artifacts Direct Link */}
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-black/30 px-4 py-3">
                <div className="flex items-center gap-2 text-white/70">
                  <Terminal className="h-4 w-4 text-[var(--jade)]" />
                  <span>Automated CI/CD Builds via GitHub Actions</span>
                </div>
                <a
                  href={ACTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-white/90 hover:text-[var(--champagne)]"
                >
                  View Artifacts <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
