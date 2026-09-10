import type { IconProps } from "../types/icon";

export default function ShareIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <title>Share icon</title>
      <path d="M12 15V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M7 12H5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-2" />
    </svg>
  );
}
