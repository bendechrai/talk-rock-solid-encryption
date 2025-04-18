'use client';

import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import '@/styles/Presentation.css';

// Import Reveal.js CSS
import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/white.css';

// Import slide data
import { slides, getSlideAttributes } from '@/lib/slide-data';

// Import demo components with dynamic loading
const Demo1 = dynamic(() => import('@/components/demos/demo-1/Demo1'), {
  loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading Demo 1...</div>
});

const Demo2 = dynamic(() => import('@/components/demos/demo-2/Demo2'), {
  loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading Demo 2...</div>
});

const Demo3 = dynamic(() => import('@/components/demos/demo-3/Demo3'), {
  loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading Demo 3...</div>
});

export default function Presentation() {
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined' || !revealRef.current) return;

    const initReveal = async () => {
      try {
        // Dynamically import Reveal.js
        const Reveal = (await import('reveal.js')).default;
        
        // Import plugins if needed
        // await import('reveal.js/plugin/notes/notes.js');

        // Initialize Reveal.js with options
        const deck = new Reveal(revealRef.current, {
          hash: true, // Enable hash navigation
          hashOneBasedIndex: false, // Use zero-based indexing for URLs
          navigationMode: 'default',
          history: true, // Enable browser history
          controls: false,
          progress: false,
          center: true,
          transition: 'slide',
          backgroundTransition: 'none', // Disable background transitions to prevent flicker
          // Use numbers for dimensions instead of strings
          width: 1920,
          height: 1080,
          margin: 0,
          minScale: 1,
          maxScale: 1,
          disableLayout: true,
        });

        // Initialize Reveal
        await deck.initialize();
        
        // Customize the URL format to match the desired pattern
        // This overrides Reveal's default hash pattern
        const customizeURLFormat = () => {
          // Get the current slide index
          const indices = deck.getIndices();
          const slideIndex = indices.h;
          
          // Update the URL to the desired format: /presentation/#1 instead of /presentation/#/1
          if (slideIndex === 0) {
            window.history.replaceState(null, '', '/presentation/#');
          } else {
            window.history.replaceState(null, '', `/presentation/#${slideIndex}`);
          }
        };
        
        // Call initially to set the correct format
        customizeURLFormat();
        
        // Add event listener to update URL on slide change
        deck.on('slidechanged', () => {
          customizeURLFormat();
        });
      } catch (error) {
        console.error('Error initializing Reveal.js:', error);
      }
    };

    initReveal();
  }, []);

  return (
    <div className="reveal" ref={revealRef}>
      <div className="slides">
        {slides.map((slide) => {
          // Create a section element with the appropriate attributes from our slide data
          const sectionProps = {
            key: slide.id,
            ...getSlideAttributes(slide),
            'data-notes': slide.notes,
          };

          // Render different content based on slide type
          if (slide.contentType === 'demo') {
            let DemoComponent = null;
            switch (slide.demoId) {
              case 'demo-1':
                DemoComponent = Demo1;
                break;
              case 'demo-2':
                DemoComponent = Demo2;
                break;
              case 'demo-3':
                DemoComponent = Demo3;
                break;
              default:
                return <section {...sectionProps}><div>Demo not found</div></section>;
            }
            
            return (
              <section {...sectionProps}>
                <h2>{slide.title}</h2>
                <div className="demo-container">
                  <DemoComponent />
                </div>
              </section>
            );
          } else {
            // Regular content slide - use the HTML content directly
            return (
              <section {...sectionProps}>
                <div dangerouslySetInnerHTML={{ __html: slide.htmlContent || '' }} />
              </section>
            );
          }
        })}
      </div>
    </div>
  );
}
