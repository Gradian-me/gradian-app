interface GlassInputWrapperProps {
  children: React.ReactNode;
}

export function GlassInputWrapper({ children }: GlassInputWrapperProps) {
  return (
    <div className="relative flex gap-2 flex-nowrap items-center rounded-xl border border-gray-400 dark:border-gray-300 bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
      {children}
    </div>
  );
}

