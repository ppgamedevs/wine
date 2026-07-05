import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

type MarketingIconProps = SVGProps<SVGSVGElement>;

function IconBase({
  className,
  children,
  ...props
}: MarketingIconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

export function MarketingValueIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.35" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 16.5h7"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.55"
      />
    </IconBase>
  );
}

export function MarketingPairingIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M7 4v7c0 1.1.9 2 2 2h0c1.1 0 2-.9 2-2V4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M9 13v7"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M15 4c0 3.5 1.5 5.5 3 7.5V20"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 8h1.5"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.6"
      />
    </IconBase>
  );
}

export function MarketingPriceIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <rect
        x="4"
        y="6"
        width="16"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <circle cx="12" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M7.5 9.5h.01M16.5 14.5h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

export function MarketingRegionIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M12 21s6-4.5 6-10a6 6 0 1 0-12 0c0 5.5 6 10 6 10Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M5 19c1.5-1 3.5-1.5 7-1.5s5.5.5 7 1.5"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.45"
      />
    </IconBase>
  );
}

export function MarketingWineryIcon(props: MarketingIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M5 20V9l7-4 7 4v11"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M9 20v-6h6v6"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M9 10h6"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.55"
      />
    </IconBase>
  );
}
