"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

/**
 * Sonner's own `theme="system"` reads prefers-color-scheme, which ignores our
 * class toggle. Watching the class instead keeps toasts in step however the
 * theme changed.
 */
export default function ThemedToaster() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setTheme(root.classList.contains("dark") ? "dark" : "light");
    read();

    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <Toaster
      richColors
      theme={theme}
      position="bottom-right"
      toastOptions={{
        style: {
          borderRadius: "12px",
          fontSize: "14px",
        },
      }}
    />
  );
}
