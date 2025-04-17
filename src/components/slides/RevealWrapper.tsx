'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Reveal, { RevealOptions, RevealSlideChangedEvent } from 'reveal.js';
import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/white.css';
import '@/styles/reveal-override.css'; // Custom overrides for Reveal.js
import styles from '@/styles/Slide.module.css';
import { getNextSlideId, getPrevSlideId, getFirstSlideId, getLastSlideId } from '@/lib/slide-data';

interface RevealWrapperProps {
  children: React.ReactNode;
  slideId: string;
}

export default function RevealWrapper({ children, slideId }: RevealWrapperProps) {
  const revealRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true once component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Initialize Reveal.js
  useEffect(() => {
    // Only run on client-side
    if (!isClient || !revealRef.current) return;

    let revealInstance: Reveal | null = null;

    // Dynamically import Reveal.js only on the client side
    const initializeReveal = async () => {
      try {
        // Dynamic import to avoid SSR issues
        // We already imported the type at the top, but need to dynamically import the actual module
        const RevealModule = await import('reveal.js');
        const RevealClass = RevealModule.default;
        
        // Initialize reveal.js with options
        const revealOptions: RevealOptions = {
          hash: false, // We'll handle navigation ourselves
          controls: true,
          progress: true,
          center: true,
          transition: 'slide',
          history: false,
          keyboard: true,
          // Let Reveal handle the navigation within the slide
          navigationMode: 'default',
          // Make sure keyboard navigation works
          embedded: false,
          // Enable all keyboard bindings
          keyboardCondition: null,
          // Disable auto-scaling
          width: '100%',
          height: '100%',
          margin: 0,
          minScale: 1,
          maxScale: 1,
          disableLayout: true,
        } as any;
        
        const deck = new RevealClass(revealRef.current, revealOptions);

        // Store the instance for later use
        revealInstance = deck;

        // Initialize reveal
        deck.initialize();

        // Handle Reveal.js navigation events to integrate with Next.js routing
        const handleSlideChange = (event: RevealSlideChangedEvent) => {
          // Get the direction based on the indices
          const isForward = 
            event.indexh > event.previoush || 
            (event.indexh === event.previoush && event.indexv > event.previousv);
          
          // Determine which slide to navigate to
          const targetSlideId = isForward 
            ? getNextSlideId(slideId)
            : getPrevSlideId(slideId);
          
          // Only navigate if we're moving to a different slide
          if (targetSlideId !== slideId) {
            router.push(`/slides/${targetSlideId}`);
          }
        };
        
        // Also add direct keyboard navigation to ensure it works
        const handleKeyDown = (event: KeyboardEvent) => {
          // Right arrow or space or down arrow
          if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'ArrowDown') {
            const nextSlideId = getNextSlideId(slideId);
            if (nextSlideId !== slideId) {
              router.push(`/slides/${nextSlideId}`);
            }
          }
          // Left arrow or up arrow
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            const prevSlideId = getPrevSlideId(slideId);
            if (prevSlideId !== slideId) {
              router.push(`/slides/${prevSlideId}`);
            }
          }
          // Home key - go to first slide
          else if (event.key === 'Home') {
            const firstSlideId = getFirstSlideId();
            router.push(`/slides/${firstSlideId}`);
          }
          // End key - go to last slide
          else if (event.key === 'End') {
            const lastSlideId = getLastSlideId();
            router.push(`/slides/${lastSlideId}`);
          }
        };
        
        // Add keyboard event listener
        document.addEventListener('keydown', handleKeyDown);

        // Listen for Reveal.js navigation events
        deck.on('slidechanged', handleSlideChange);

        return () => {
          // Clean up event listeners
          if (revealInstance) {
            revealInstance.off('slidechanged', handleSlideChange);
            revealInstance.destroy();
          }
          // Remove keyboard event listener
          document.removeEventListener('keydown', handleKeyDown);
        };
      } catch (error) {
        console.error('Failed to initialize Reveal.js:', error);
        return () => {}; // Return empty cleanup function in case of error
      }
    };
    
    // Call initializeReveal and handle the returned Promise
    const cleanupPromise = initializeReveal();
    
    // Return cleanup function
    return () => {
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      });
    };
  }, [isClient, slideId, router]);

  return (
    <div className="reveal" ref={revealRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
      <div className="slides" style={{ width: '100%', height: '100%' }}>
        <section data-markdown="" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, margin: 0 }}>
          {children}
        </section>
      </div>
    </div>
  );
}
