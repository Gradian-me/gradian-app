"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import { TestimonialCard, type Testimonial } from './TestimonialCard';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-7xl px-8 z-20">
      <Carousel
        plugins={[plugin.current]}
        className="w-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
        opts={{
          align: "start",
          loop: true,
          slidesToScroll: 1,
        }}
      >
        <CarouselContent className="-ml-2 lg:-ml-4">
          {testimonials.map((testimonial, index) => (
            <CarouselItem 
              key={index} 
              className="pl-2 lg:pl-4 basis-full lg:basis-1/2"
            >
              <TestimonialCard testimonial={testimonial} delay="" />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}

