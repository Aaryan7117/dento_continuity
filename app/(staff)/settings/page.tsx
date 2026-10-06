import { Settings } from "lucide-react";
import { getClinicSettings, listChairs } from "@/lib/clinic";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, chairs] = await Promise.all([getClinicSettings(), listChairs(true)]);

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
    </div>
  );
}
