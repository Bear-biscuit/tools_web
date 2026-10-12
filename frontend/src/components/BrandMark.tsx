import type { SVGProps } from "react";

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" {...props}>
      <path
        d="M11 8.5h8.2c4.7 0 7.4 2.2 7.4 5.8 0 1.9-.9 3.3-2.5 4.2 2.3.8 3.6 2.7 3.6 5.1 0 4.2-3 6.5-7.8 6.5H11V8.5Z"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      <path d="M18.3 14.6h1.8c1.2 0 1.9-.5 1.9-1.5s-.7-1.5-1.9-1.5h-1.8v3Z" fill="currentColor" />
      <path d="M18.3 23h2.4c1.3 0 2-.6 2-1.8s-.7-1.8-2-1.8h-2.4V23Z" fill="currentColor" />
    </svg>
  );
}
