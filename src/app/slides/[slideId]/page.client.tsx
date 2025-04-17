'use client';

import { useParams } from 'next/navigation';
import { getSlideById } from '@/lib/slide-data';
import SlideContent from '@/components/slides/SlideContent';
import RevealWrapper from '@/components/slides/RevealWrapper';
import { notFound } from 'next/navigation';

export default function SlidePageClient() {
  // Use client-side hooks to get the params
  const params = useParams();
  const slideId = params.slideId as string;
  const slide = getSlideById(slideId);
  
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
