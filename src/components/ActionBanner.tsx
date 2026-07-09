interface ActionBannerProps {
  message: string | null;
}

export function ActionBanner({ message }: ActionBannerProps) {
  if (!message) return null;

  return (
    <div key={message} className="pointer-events-none animate-action-banner mb-1">
      <div className="px-5 py-2 rounded-full bg-surface/90 backdrop-blur-md border border-white/10 shadow-module">
        <p className="text-sm font-medium text-white whitespace-nowrap">{message}</p>
      </div>
    </div>
  );
}
