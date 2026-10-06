"use client";

/**
 * "Fill by voice" for a form. Say the details in one breath — "Priya Sharma,
 * phone 98765 43210, born 14 March 1990, email priya at gmail dot com" — and
 * the matching inputs are filled for review. Nothing is submitted.
 *
 * Works on plain inputs by name, including React-controlled ones (the value
 * is set through the native setter so React notices the change).
 */

import { useState } from "react";
import * as chrono from "chrono-node";
import { Loader2, Mic, MicOff } from "lucide-react";
import { useSpeech } from "./useSpeech";

export interface VoiceField {
  /** The input's `name` attribute. */
  name: string;
  /** Words that introduce the value when spoken. */
  aliases: string[];
  type: "text" | "phone" | "date" | "email" | "checkbox";
}

const WORD_DIGITS: Record<string, string> = {
  zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  double: "", triple: "",
};

function digitsFrom(text: string): string {
  const tokens = text.toLowerCase().split(/[\s-]+/);
  let out = "";
  let repeat = 1;
  for (const t of tokens) {
    if (t === "double") { repeat = 2; continue; }
    if (t === "triple") { repeat = 3; continue; }
    const d = /^\d+$/.test(t) ? t : WORD_DIGITS[t];
    if (d !== undefined && d !== "") {
      out += d.repeat(repeat);
      repeat = 1;
    }
  }
  return out;
}

function emailFrom(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+at\s+/g, "@")
    .replace(/\s+dot\s+/g, ".")
    .replace(/\s+underscore\s+/g, "_")
    .replace(/\s+/g, "");
}

function dateFrom(text: string): string | null {
  const r = chrono.parse(text, new Date(), { forwardDate: false })[0];
  if (!r || !r.start.isCertain("year")) return null;
  const d = r.start.date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function titleCase(s: string): string {
  return s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

export function assignFields(transcript: string, fields: VoiceField[]): Record<string, string | boolean> {
  const text = transcript.replace(/[,.;]+/g, " , ").replace(/\s+/g, " ").trim();
  // Every alias becomes a boundary; the words after it up to the next boundary are its value.
  const boundaries: { index: number; length: number; field: VoiceField }[] = [];
  for (const f of fields) {
    for (const alias of f.aliases) {
      const re = new RegExp(`(?:^|\\s|,\\s)(?:the\\s+|her\\s+|his\\s+)?${alias.replace(/\s+/g, "\\s+")}(?:\\s+is|\\s+number|\\s+are)?\\s*:?\\s+`, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) boundaries.push({ index: m.index, length: m[0].length, field: f });
    }
  }
  boundaries.sort((a, b) => a.index - b.index);

  const out: Record<string, string | boolean> = {};
  const lead = boundaries.length ? text.slice(0, boundaries[0].index) : text;
  const leadName = lead.replace(/,/g, " ").replace(/\b(new patient|patient|name is|name)\b/gi, "").trim();
  if (leadName) {
    const parts = leadName.split(/\s+/);
    const first = fields.find((f) => f.name === "firstName");
    const last = fields.find((f) => f.name === "lastName");
    if (first) out.firstName = titleCase(parts[0]);
    if (last && parts.length > 1) out.lastName = titleCase(parts.slice(1).join(" "));
  }

  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    const end = i + 1 < boundaries.length ? boundaries[i + 1].index : text.length;
    const raw = text.slice(b.index + b.length, end).replace(/\s*,\s*$/, "").trim();
    if (!raw && b.field.type !== "checkbox") continue;
    switch (b.field.type) {
      case "phone":
        out[b.field.name] = digitsFrom(raw);
        break;
      case "email":
        out[b.field.name] = emailFrom(raw);
        break;
      case "date": {
        const d = dateFrom(raw);
        if (d) out[b.field.name] = d;
        break;
      }
      case "checkbox":
        out[b.field.name] = !/\b(no|not|without|declined)\b/i.test(raw);
        break;
      default:
        out[b.field.name] = titleCase(raw.replace(/,/g, ""));
    }
  }
  return out;
}

function setInputValue(name: string, value: string | boolean) {
  const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
  if (!el) return false;
  if (el instanceof HTMLInputElement && el.type === "checkbox") {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set;
    setter?.call(el, Boolean(value));
    el.dispatchEvent(new Event("click", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, String(value));
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

export default function VoiceFill({ fields, hint }: { fields: VoiceField[]; hint: string }) {
  const [last, setLast] = useState<{ heard: string; filled: string[] } | null>(null);
  const speech = useSpeech((text) => {
    const values = assignFields(text, fields);
    const filled: string[] = [];
    for (const [name, value] of Object.entries(values)) {
      if (setInputValue(name, value)) filled.push(name);
    }
    setLast({ heard: text, filled });
  });

  if (speech.supported === false) return null;

  return (
    <div
      className="rounded-xl px-3.5 py-3 flex items-start gap-3"
      style={{ background: "rgb(var(--brand-rgb) / 0.06)", border: "1px solid rgb(var(--brand-rgb) / 0.2)" }}
    >
      <button
        type="button"
        onClick={() => (speech.listening ? speech.stop() : speech.start())}
        className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
        style={{ background: speech.listening ? "#ef4444" : "var(--grad-brand)" }}
        title={speech.listening ? "Stop" : "Fill by voice"}
      >
        {speech.listening ? <MicOff className="w-4 h-4" /> : speech.supported === null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
      </button>
      <div className="text-xs min-w-0" style={{ color: "var(--ink-muted)" }}>
        <p className="font-semibold" style={{ color: "var(--ink)" }}>
          {speech.listening ? (speech.interim || "Listening…") : "Fill by voice"}
        </p>
        {!speech.listening && !last && <p className="mt-0.5">{hint}</p>}
        {!speech.listening && last && (
          <p className="mt-0.5">
            Heard “{last.heard}”. {last.filled.length ? `Filled ${last.filled.length} field${last.filled.length === 1 ? "" : "s"}; please check them.` : "No fields matched; try naming them, e.g. “phone 98765 43210”."}
          </p>
        )}
        {speech.error && <p className="mt-0.5" style={{ color: "#ef4444" }}>{speech.error}</p>}
      </div>
    </div>
  );
}
