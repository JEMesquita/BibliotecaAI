import type { SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function base({ size = 18, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export const IconLogo = ({ size = 26, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" {...rest}>
    <path d="M6 6.5c3.6 1.4 6.8 1.4 10 0v19c-3.2 1.4-6.4 1.4-10 0v-19z" fill="#D9A441" />
    <path d="M16 6.5c3.2 1.4 6.4 1.4 10 0v19c-3.6 1.4-6.8 1.4-10 0v-19z" fill="#8A6A2F" />
    <path d="M16 6.5v19" stroke="#0C110D" strokeWidth="1.4" />
    <path d="M9 12h4M9 15.5h4M19 12h4M19 15.5h4" stroke="#0C110D" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const IconSearch = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);

export const IconUpload = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 15V4m0 0 4 4m-4-4L8 8" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const IconX = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconTrash = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const IconStar = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
    <path d="m12 3.6 2.5 5.2 5.7.7-4.2 3.9 1.1 5.6-5.1-2.8-5.1 2.8 1.1-5.6-4.2-3.9 5.7-.7L12 3.6z" />
  </svg>
);

export const IconBookOpen = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 6.5C10 5 7.5 4.5 4 4.5v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-14c-3.5 0-6 .5-8 2z" />
    <path d="M12 6.5v14" />
  </svg>
);

export const IconChevronLeft = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m14 6-6 6 6 6" />
  </svg>
);

export const IconChevronRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m10 6 6 6-6 6" />
  </svg>
);

export const IconDownload = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4v11m0 0 4-4m-4 4-4-4" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const IconExternal = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 5h5v5M19 5l-8 8" />
    <path d="M19 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4.5" />
  </svg>
);

export const IconPencil = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17l-1 3z" />
    <path d="m14.5 7.5 3 3" />
  </svg>
);

export const IconGrid = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="7" height="9" rx="1" />
    <rect x="13" y="4" width="7" height="9" rx="1" />
    <rect x="4" y="15" width="7" height="5" rx="1" />
    <rect x="13" y="15" width="7" height="5" rx="1" />
  </svg>
);

export const IconRows = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const IconCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const IconAlert = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4 2.8 19.5h18.4L12 4z" />
    <path d="M12 10v4.5M12 17.4v.1" />
  </svg>
);

export const IconInfo = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.6v.1" />
  </svg>
);

export const IconFile = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 3h8l4 4v14H6V3z" />
    <path d="M14 3v4h4M9 12h6M9 16h6" />
  </svg>
);

export const IconSpinner = ({ size = 18, className = "", ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`animate-spin ${className}`}
    {...rest}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const IconLamp = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 3h6l3 7H6l3-7z" />
    <path d="M12 10v7M8 21h8M12 17c-1.7 0-2.6 1.3-2.8 4M12 17c1.7 0 2.6 1.3 2.8 4" />
  </svg>
);

export const IconPlus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
