'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { slides } from '../slide-data';

interface SlideContextProps {
  currentSlideId: string;
  goToSlide: (id: string) => void;
  goToNextSlide: () => void;
  goToPrevSlide: () => void;
  isFirstSlide: boolean;
  isLastSlide: boolean;
}

const SlideContext = createContext<SlideContextProps | undefined>(undefined);

export function SlideProvider({ children }: { children: ReactNode }) {
  const [currentSlideId, setCurrentSlideId] = useState(slides[0].id);
  
  const currentIndex = slides.findIndex(slide => slide.id === currentSlideId);
  const isFirstSlide = currentIndex === 0;
  const isLastSlide = currentIndex === slides.length - 1;
  
  const goToSlide = (id: string) => {
    if (slides.some(slide => slide.id === id)) {
      setCurrentSlideId(id);
    }
  };
  
  const goToNextSlide = () => {
    if (!isLastSlide) {
      setCurrentSlideId(slides[currentIndex + 1].id);
    }
  };
  
  const goToPrevSlide = () => {
    if (!isFirstSlide) {
      setCurrentSlideId(slides[currentIndex - 1].id);
    }
  };
  
  return (
    <SlideContext.Provider value={{
      currentSlideId,
      goToSlide,
      goToNextSlide,
      goToPrevSlide,
      isFirstSlide,
      isLastSlide
    }}>
      {children}
    </SlideContext.Provider>
  );
}

export function useSlide() {
  const context = useContext(SlideContext);
  if (!context) {
    throw new Error('useSlide must be used within a SlideProvider');
  }
  return context;
}
