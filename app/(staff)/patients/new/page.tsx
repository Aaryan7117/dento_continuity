"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPatient } from "@/lib/actions";
import { UserPlus, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      dateOfBirth: formData.get("dateOfBirth") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      address: formData.get("address") as string,
      consentGiven: formData.get("consentGiven") === "on",
    };

    const res = await createPatient(data);
    if (res.ok) {
      toast.success("Patient registered", {
        description: `${data.firstName} ${data.lastName} has been added.`,
      });
      router.push(`/patients/${res.data.patientId}`);
    } else {
      setLoading(false);
      toast.error("Failed to create patient", {
        description: res.error.message,
      });
    }
  }

  const inputStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
    transition:
      "border-color 150ms var(--ease-out), box-shadow 150ms var(--ease-out)",
  };

  function focusHandler(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = "#019d8e";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(1, 157, 142, 0.08)";
  }

  function blurHandler(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = "var(--border)";
    e.currentTarget.style.boxShadow = "none";
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/patients"
          className="p-2 rounded-lg no-press"
          data-no-press
          style={{
            color: "var(--text-tertiary)",
            transition: "color 150ms var(--ease-out)",
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: "var(--foreground)" }}
          >
            <UserPlus className="w-6 h-6" style={{ color: "#019d8e" }} />
            New Patient
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Register a new patient record.
          </p>
        </div>
      </div>

      <div className="card p-7">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5 stagger-item">
              <label className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                First Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                required
                type="text"
                name="firstName"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
                placeholder="Jane"
              />
            </div>
            <div className="space-y-1.5 stagger-item">
              <label className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                Last Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                required
                type="text"
                name="lastName"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
                placeholder="Doe"
              />
            </div>
            <div className="space-y-1.5 stagger-item">
              <label className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                Date of Birth <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                required
                type="date"
                name="dateOfBirth"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>
            <div className="space-y-1.5 stagger-item">
              <label className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                Phone <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                required
                type="tel"
                name="phone"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-1.5 stagger-item">
              <label className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2 stagger-item">
              <label className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                Address
              </label>
              <input
                type="text"
                name="address"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
                placeholder="123 Dental Way, Suite 100"
              />
            </div>
          </div>

          <div className="pt-3 stagger-item" style={{ borderTop: "1px solid var(--border)" }}>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                name="consentGiven"
                className="mt-1 w-4 h-4 rounded cursor-pointer accent-[#019d8e]"
              />
              <div>
                <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Patient Consent
                </span>
                <span className="block text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  Patient has read and signed the clinic consent forms.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-2.5 stagger-item">
            <Link
              href="/patients"
              className="px-4 py-2.5 text-sm font-semibold rounded-xl no-press"
              data-no-press
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                transition: "background 150ms var(--ease-out)",
              }}
            >
              Cancel
            </Link>
            <button
              disabled={loading}
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #019d8e, #067d73)",
                transition: "opacity 150ms var(--ease-out)",
              }}
            >
              {loading ? (
                "Saving…"
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Patient
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
