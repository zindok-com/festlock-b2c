// 음악 플랫폼 아이콘 (간단히 직접 그린 모양. 각 상표는 해당 회사 것)
import type { ReactNode } from "react";

export type Platform = "youtube" | "spotify" | "apple" | "melon";

const GLYPH: Record<Platform, ReactNode> = {
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="#ff0033" />
      <path d="M10 9l5.2 3L10 15z" fill="#fff" />
    </>
  ),
  spotify: (
    <>
      <circle cx="12" cy="12" r="10" fill="#1ed760" />
      <g fill="none" stroke="#000" strokeLinecap="round">
        <path d="M6.6 9.4c3.6-1.1 7.6-.8 10.9 1" strokeWidth="1.9" />
        <path d="M7.2 12.6c3-.8 6.2-.5 8.8.9" strokeWidth="1.6" />
        <path d="M7.8 15.6c2.4-.6 4.8-.4 6.8.7" strokeWidth="1.4" />
      </g>
    </>
  ),
  apple: (
    <>
      <defs>
        <linearGradient id="am-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fd5b78" />
          <stop offset="1" stopColor="#f81c3c" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#am-g)" />
      <path d="M15.6 6.2v8.6a2.2 2.2 0 1 1-1.3-2V8.9l-4.6 1.1v5.9a2.2 2.2 0 1 1-1.3-2V7.6z" fill="#fff" />
    </>
  ),
  melon: (
    <>
      <circle cx="12" cy="12" r="10" fill="#00cd3c" />
      <path d="M7 16V8.2l5 4.6 5-4.6V16" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export function PlatformIcon({ p, size = 20 }: { p: Platform; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      {GLYPH[p]}
    </svg>
  );
}
