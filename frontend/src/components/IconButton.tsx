import { forwardRef, type ButtonHTMLAttributes } from "react";

export type IconName =
  | "close"
  | "favorite"
  | "next"
  | "pause"
  | "play"
  | "previous"
  | "rotate"
  | "settings"
  | "single"
  | "split"
  | "stop"
  | "tools"
  | "trash";

const ICON_PATHS: Record<IconName, string> = {
  close: "M6 6l12 12M18 6L6 18",
  favorite: "M12 5l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 10.2l5-.7L12 5z",
  next: "M6 5l9 7-9 7V5zm10 0h2v14h-2V5z",
  pause: "M7 5h3v14H7V5zm7 0h3v14h-3V5z",
  play: "M7 5l12 7-12 7V5z",
  previous: "M18 5l-9 7 9 7V5zM6 5h2v14H6V5z",
  rotate: "M17 2v5h-5M17 7a7 7 0 10-2.1 5M7 22v-5h5M7 17a7 7 0 102.1-5",
  settings: "M12 8a4 4 0 100 8 4 4 0 000-8zm0-5v3m0 12v3M4.2 4.2l2.1 2.1m11.4 11.4l2.1 2.1M3 12h3m12 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
  single: "M5 6h14v12H5V6z",
  split: "M5 6h14v12H5V6zm7 0v12",
  stop: "M7 7h10v10H7V7z",
  tools: "M5 7h14M5 12h14M5 17h14",
  trash: "M7 8h10m-8 0V6h6v2m-7 0l1 11h6l1-11"
};

export function Icon({ name }: { name: IconName }) {
  const fill = name === "play" || name === "pause" || name === "stop" ? "currentColor" : "none";
  return (
    <svg aria-hidden="true" className="icon" focusable="false" viewBox="0 0 24 24">
      <path
        d={ICON_PATHS[name]}
        fill={fill}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export const IconButton = forwardRef<HTMLButtonElement, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> & {
  label: string;
  name: IconName;
}>(
function IconButton(
  { label, name, className = "", ...props },
  ref
) {
  return (
    <button
      {...props}
      aria-label={label}
      className={`icon-button ${className}`.trim()}
      ref={ref}
      title={label}
      type={props.type ?? "button"}
    >
      <Icon name={name} />
    </button>
  );
});
