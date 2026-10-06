import { Settings } from "lucide-react";
import { getClinicSettings, listChairs } from "@/lib/clinic";
import { localAsrInfo } from "@/lib/voice/local-asr";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, chairs] = await Promise.all([getClinicSettings(), listChairs(true)]);
  const voice = localAsrInfo();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--ink)" }}>
          <Settings className="w-6 h-6" style={{ color: "var(--brand)" }} />
          Clinic settings
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--ink-muted)" }}>
          Opening hours drive the slot picker; chairs let two patients be seen at once.
        </p>
      </div>
      <SettingsClient settings={settings} chairs={chairs} />
      <div className="card p-7 space-y-1">
        <h2 className="text-base font-bold" style={{ color: "var(--ink)" }}>Voice recognition</h2>
        {voice.available ? (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            On this computer: <strong>{voice.engine}</strong> model installed. Spoken commands are recognised here; no audio leaves the machine.
          </p>
        ) : (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Using the browser&apos;s recogniser (audio is processed by the browser vendor). The desktop app offers an on-device model on first launch.
          </p>
        )}
      </div>
    </div>
  );
}
