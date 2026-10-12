import type { SVGProps } from "react";

export function NovaMascot(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="nova-mascot"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <ellipse className="nova-mascot__shadow" cx="24" cy="42" rx="11" ry="2.5" fill="#b7c5da" />
      <path className="nova-mascot__antenna" d="M24 9V4" stroke="#1e43d6" strokeWidth="2.6" strokeLinecap="round" />
      <circle className="nova-mascot__spark" cx="24" cy="3.5" r="3" fill="#ffd43b" />
      <rect className="nova-mascot__body" x="8" y="8" width="32" height="31" rx="14" fill="#ffd43b" stroke="#d9ad00" strokeWidth="2" />
      <ellipse className="nova-mascot__cheek" cx="13.5" cy="27" rx="3" ry="2" fill="#ff9eb0" />
      <ellipse className="nova-mascot__cheek" cx="34.5" cy="27" rx="3" ry="2" fill="#ff9eb0" />
      <circle className="nova-mascot__eye" cx="18.5" cy="22" r="2.35" fill="#10203a" />
      <circle className="nova-mascot__eye" cx="29.5" cy="22" r="2.35" fill="#10203a" />
      <path className="nova-mascot__smile" d="M19.5 29c1.4 2 2.9 3 4.5 3s3.1-1 4.5-3" stroke="#10203a" strokeWidth="2" strokeLinecap="round" />
      <circle cx="17.7" cy="21.1" r=".8" fill="#ffffff" />
      <circle cx="28.7" cy="21.1" r=".8" fill="#ffffff" />
    </svg>
  );
}
