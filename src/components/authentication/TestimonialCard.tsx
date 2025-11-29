export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface TestimonialCardProps {
  testimonial: Testimonial;
  delay?: string;
}

export function TestimonialCard({ testimonial, delay = '' }: TestimonialCardProps) {
  return (
    <div
      className={`group animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-card/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-white/10 p-5 w-64 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg hover:border-violet-400/30 hover:bg-white/70 dark:hover:bg-zinc-800/60`}
    >
      <img
        src={testimonial.avatarSrc}
        className="h-10 w-10 object-cover rounded-2xl transition-transform duration-200 group-hover:-rotate-2 group-hover:scale-[1.02]"
        alt={`${testimonial.name} avatar`}
      />
      <div className="text-sm leading-snug">
        <p className="flex items-center gap-1 font-medium text-foreground transition-colors duration-200 group-hover:text-violet-400">
          {testimonial.name}
        </p>
        <p className="text-muted-foreground transition-colors duration-200 group-hover:text-violet-400">
          {testimonial.handle}
        </p>
        <p className="mt-1 text-foreground/80 transition-colors duration-200 group-hover:text-foreground">
          {testimonial.text}
        </p>
      </div>
    </div>
  );
}

