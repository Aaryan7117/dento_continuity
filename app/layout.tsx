import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import ThemedToaster from "./components/ThemedToaster";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "DENTO Continuity | Intelligent Dental Practice Management",
  description:
    "One clean clinical record, and a retention agent that recovers missed appointments — with a human approving every message.",
};

/**
 * Runs before first paint so a dark-mode reload never flashes the light canvas.
 * Has to be inline and blocking; a React effect is far too late.
 */
const themeInit = `
(function(){try{
  var s=localStorage.getItem("theme");
  var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;
  if(d)document.documentElement.classList.add("dark");
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${outfit.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased">
        {children}
        <ThemedToaster />
      </body>
    </html>
  );
}
