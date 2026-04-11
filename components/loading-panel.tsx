"use client";

type LoadingPanelProps = {
  title?: string;
  subtitle?: string;
};

export default function LoadingPanel({
  title = "Loading your workspace",
  subtitle = "Preparing your latest data...",
}: LoadingPanelProps) {
  return (
    <div className="panel w-full max-w-md p-5">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs muted">{subtitle}</p>
      <div className="mt-4 grid gap-2">
        <div className="skeleton h-3 w-5/6" />
        <div className="skeleton h-3 w-4/6" />
        <div className="skeleton h-3 w-3/6" />
      </div>
    </div>
  );
}
