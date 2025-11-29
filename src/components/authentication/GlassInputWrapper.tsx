interface GlassInputWrapperProps {
  children: React.ReactNode;
}

export function GlassInputWrapper({ children }: GlassInputWrapperProps) {
  return (
    <div className="relative flex gap-2 flex-nowrap items-center rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
      {children}
    </div>
  );
}

