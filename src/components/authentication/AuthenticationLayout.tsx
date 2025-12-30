import { ReactNode } from 'react';
import { ModeToggle } from '@/gradian-ui/layout';
import { AuthenticationHeroSection } from './AuthenticationHeroSection';

interface AuthenticationLayoutProps {
  children: ReactNode;
  heroImageSrc?: string;
  showTestimonials?: boolean;
  showModeToggle?: boolean;
  neonOrbsTitle?: string;
  neonOrbsSubtitle?: string;
}

export function AuthenticationLayout({
  children,
  heroImageSrc,
  showTestimonials = true,
  showModeToggle = true,
  neonOrbsTitle,
  neonOrbsSubtitle,
}: AuthenticationLayoutProps) {
  return (
    <div className="min-h-screen h-screen flex flex-col md:flex-row font-sans overflow-hidden">
      <section className="flex-1 flex items-center justify-center p-8 overflow-y-auto min-h-0 relative hide-scrollbar">
        {showModeToggle && (
          <div className="absolute top-8 right-8 z-10">
            <ModeToggle />
          </div>
        )}
        {children}
      </section>
      <AuthenticationHeroSection 
        heroImageSrc={heroImageSrc} 
        showTestimonials={showTestimonials}
        neonOrbsTitle={neonOrbsTitle}
        neonOrbsSubtitle={neonOrbsSubtitle}
      />
    </div>
  );
}

