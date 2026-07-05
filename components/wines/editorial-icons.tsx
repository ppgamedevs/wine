import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

type EditorialIconProps = SVGProps<SVGSVGElement>;

function IconBase({
  className,
  children,
  ...props
}: EditorialIconProps & { children: ReactNode }) {
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

/** Stylized wine glass for editorial "about" sections. */
export function EditorialWineIcon(props: EditorialIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M8 3h8l-1.5 8.5c-.35 2-1.8 3.5-3.5 3.5s-3.15-1.5-3.5-3.5L8 3Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M12 15v4M9.5 21h5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M9 6.5h6"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.55"
      />
    </IconBase>
  );
}

/** Balance scale for value score. */
export function EditorialValueIcon(props: EditorialIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M12 4v16M6 8h12"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M6 8 4 13a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2l-2-5ZM18 8l-2 5a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2l2-5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="4" r="1.25" fill="currentColor" />
    </IconBase>
  );
}

/** Grape cluster for taste profile. */
export function EditorialTasteIcon(props: EditorialIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="14" r="2.25" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="9" cy="10.5" r="1.75" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="15" cy="10.5" r="1.75" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="10.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.15" />
      <circle cx="13.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.15" />
      <path
        d="M12 4.5v2.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M10 3.5c.5-.75 1.5-.75 2 0 .5.75 1.5.75 2 0"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

/** Sealed scroll for insider tips. */
export function EditorialInsightIcon(props: EditorialIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M7 5h10a2 2 0 0 1 2 2v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M7 5v13M17 5v13"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M9.5 9h5M9.5 12h5M9.5 15h3"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
    </IconBase>
  );
}

/** Chef hat with fork for pairings. */
export function EditorialPairingIcon(props: EditorialIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4v1H8v-1Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M7 11h10v1.5c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2V11Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M10 14.5v4M14 14.5v4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M5 19h14"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M4 8V6M6.5 7V5M9 8V6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

/** Calendar with wine accent for occasions. */
export function EditorialOccasionIcon(props: EditorialIconProps) {
  return (
    <IconBase {...props}>
      <rect
        x="4"
        y="6"
        width="16"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M8 4v4M16 4v4M4 10h16"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M9.5 14.5c.4.8 1.2 1.3 2.1 1.3.9 0 1.7-.5 2.1-1.3"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <path
        d="M11 14v2.5"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

/** Gift ribbon for gift score cards. */
export function EditorialGiftIcon(props: EditorialIconProps) {
  return (
    <IconBase {...props}>
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M12 10v10M5 14h14"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M8.5 10c-1.2 0-2-.8-2-1.8C6.5 7 8 6 9.5 7.5 10.5 8.5 11 10 12 10s1.5-1.5 2.5-2.5C16 6 17.5 7 17.5 8.2c0 1-.8 1.8-2 1.8"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

/** Food match icon for score cards. */
export function EditorialFoodMatchIcon(props: EditorialIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M6 4v8c0 1.1.9 2 2 2h0c1.1 0 2-.9 2-2V4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M8 4v16"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M14 4c0 4 2 6 4 8v8"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 8h2"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.6"
      />
    </IconBase>
  );
}
