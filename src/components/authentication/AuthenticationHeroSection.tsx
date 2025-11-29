import { NeonOrbs } from '@/components/ui/neon-orbs';
import { TestimonialsSection } from './TestimonialsSection';
import { SAMPLE_TESTIMONIALS } from './testimonials-data';

interface AuthenticationHeroSectionProps {
  heroImageSrc?: string;
  showTestimonials?: boolean;
  neonOrbsTitle?: string;
  neonOrbsSubtitle?: string;
}

export function AuthenticationHeroSection({
  heroImageSrc,
  showTestimonials = true,
  neonOrbsTitle,
  neonOrbsSubtitle,
}: AuthenticationHeroSectionProps) {
  return (
    <section className="hidden md:block flex-1 relative p-4 overflow-hidden">
      {heroImageSrc ? (
        <>
          <div
            className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          />
          {showTestimonials && <TestimonialsSection testimonials={SAMPLE_TESTIMONIALS} />}
        </>
      ) : (
        <>
          <NeonOrbs title={neonOrbsTitle} subtitle={neonOrbsSubtitle} />
          {showTestimonials && <TestimonialsSection testimonials={SAMPLE_TESTIMONIALS} />}
        </>
      )}
    </section>
  );
}

