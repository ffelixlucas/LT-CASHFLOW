import Image from "next/image";

export type BrandLogoVariant = "hero" | "auth" | "nav" | "dashboard" | "onboarding";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
};

/** Mesmas proporções dos PNGs em `public/brand/`. */
const BASE = { width: 1198, height: 319 } as const;

const VARIANT = {
  hero: {
    src: "/brand/ltcashflow-logo-horizontal-1-tight.png",
    sizes: "(max-width: 768px) 220px, 320px",
    className: "h-auto w-[200px] sm:w-[280px] md:w-[320px]",
  },
  auth: {
    src: "/brand/ltcashflow-logo-horizontal-1-tight.png",
    sizes: "(max-width: 640px) 180px, 300px",
    className: "h-auto w-[180px] max-w-full sm:w-[300px]",
  },
  onboarding: {
    src: "/brand/ltcashflow-logo-horizontal-1-tight.png",
    sizes: "(max-width: 640px) 180px, 330px",
    className: "h-auto w-[180px] sm:w-[330px]",
  },
  nav: {
    src: "/brand/ltcashflow-logo-horizontal-1-tight.png",
    sizes: "140px",
    className: "h-auto w-[112px] sm:w-[132px]",
  },
  dashboard: {
    src: "/brand/ltcashflow-logo-horizontal-1-tight.png",
    sizes: "(max-width: 768px) 210px, 260px",
    className: "h-auto w-[190px] sm:w-[240px] lg:w-[260px]",
  },
} as const;

export function BrandLogo({ variant = "auth", className = "", priority }: BrandLogoProps) {
  const spec = VARIANT[variant];
  return (
    <Image
      alt="LT CashFlow"
      className={[spec.className, className].filter(Boolean).join(" ")}
      height={BASE.height}
      priority={priority}
      sizes={spec.sizes}
      src={spec.src}
      width={BASE.width}
    />
  );
}
