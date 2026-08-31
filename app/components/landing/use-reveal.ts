"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sets data-shown once the element scrolls into view, so `.reveal` in
 * globals.css can transition it in. Fires once and disconnects.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.18,
) {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, shown };
}
