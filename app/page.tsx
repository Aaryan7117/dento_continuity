import type { Metadata } from "next";
import LandingNav from "@/app/components/landing/LandingNav";
import HeroArch from "@/app/components/landing/HeroArch";
import FeatureShowcase from "@/app/components/landing/FeatureShowcase";
import MetricsProof from "@/app/components/landing/MetricsProof";
import PricingTiers from "@/app/components/landing/PricingTiers";
import ClosingCta from "@/app/components/landing/ClosingCta";

export const metadata: Metadata = {
  title: "DENTO Continuity | Intelligent Dental Practice Management",
  description:
    "One structured clinical record in place of paper and spreadsheets, and a retention agent that recovers missed appointments — with a human approving every message.",
};

export default function LandingPage() {
  return (
    <div data-theme="editorial" className="grain vignette relative flex-1">
      <LandingNav />
      <main>
        <HeroArch />
        <FeatureShowcase />
        <MetricsProof />
        <PricingTiers />
        <ClosingCta />
      </main>
    </div>
  );
}
