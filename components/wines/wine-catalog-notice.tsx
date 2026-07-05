interface WineCatalogNoticeProps {
  message: string;
}

export function WineCatalogNotice({ message }: WineCatalogNoticeProps) {
  return (
    <section
      aria-live="polite"
      className="border-b border-wine/20 bg-wine/5"
    >
      <div className="mx-auto max-w-6xl px-6 py-4">
        <p className="text-sm text-foreground">{message}</p>
      </div>
    </section>
  );
}
