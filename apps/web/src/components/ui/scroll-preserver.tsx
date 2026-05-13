"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { preserveScrollPosition, restorePreservedScrollPosition } from "@/lib/client/scroll-preservation";

export function ScrollPreserver() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    function handleSubmit() {
      preserveScrollPosition();
    }

    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  useEffect(() => {
    restorePreservedScrollPosition();
    const early = window.setTimeout(restorePreservedScrollPosition, 120);
    const late = window.setTimeout(restorePreservedScrollPosition, 360);

    return () => {
      window.clearTimeout(early);
      window.clearTimeout(late);
    };
  }, [pathname, searchParams]);

  return null;
}
