'use client';

import { Slide } from '@/lib/slide-data';
import SlideContent from './SlideContent';
import RevealWrapper from './RevealWrapper';
import { notFound } from 'next/navigation';

interface ClientSlideProps {
  slideId: string;
  slide: Slide | undefined;
}

export default function ClientSlide({ slideId, slide }: ClientSlideProps) {
  if (!slide) {
    return notFound();
  }
  
  return (
    <main className="slide-container">
      <RevealWrapper slideId={slideId}>
        <SlideContent slide={slide} />
      </RevealWrapper>
    </main>
  );
}
