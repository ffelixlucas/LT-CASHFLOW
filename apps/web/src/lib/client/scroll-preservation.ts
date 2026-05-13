"use client";

const SCROLL_KEY = "ltcashflow:preserved-scroll";

type ScrollPosition = {
  x: number;
  y: number;
};

export function preserveScrollPosition() {
  if (typeof window === "undefined") {
    return;
  }

  const position: ScrollPosition = {
    x: window.scrollX,
    y: window.scrollY,
  };

  sessionStorage.setItem(SCROLL_KEY, JSON.stringify(position));
}

export function restorePreservedScrollPosition() {
  if (typeof window === "undefined") {
    return;
  }

  const raw = sessionStorage.getItem(SCROLL_KEY);

  if (!raw) {
    return;
  }

  try {
    const position = JSON.parse(raw) as Partial<ScrollPosition>;
    const x = Number(position.x ?? 0);
    const y = Number(position.y ?? 0);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    requestAnimationFrame(() => {
      window.scrollTo({ left: x, top: y, behavior: "auto" });
    });
    window.setTimeout(() => {
      if (sessionStorage.getItem(SCROLL_KEY) === raw) {
        sessionStorage.removeItem(SCROLL_KEY);
      }
    }, 800);
  } catch {
    sessionStorage.removeItem(SCROLL_KEY);
    /* ignore invalid persisted scroll */
  }
}
