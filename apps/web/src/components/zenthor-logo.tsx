import type { SVGProps } from "react";

export function ZenthorMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M8 8h24L8 32h24"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8h24L8 32h24"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.3"
        transform="translate(2, 2)"
      />
    </svg>
  );
}

export function ZenthorLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 180 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M8 8h24L8 32h24"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8h24L8 32h24"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.3"
        transform="translate(2, 2)"
      />
      <text
        x="48"
        y="28"
        fill="currentColor"
        fontFamily="var(--font-display), sans-serif"
        fontSize="20"
        fontWeight="600"
        letterSpacing="0.02em"
      >
        zenthor
      </text>
    </svg>
  );
}
