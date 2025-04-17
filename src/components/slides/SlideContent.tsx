import React, { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Slide, SlideComponentData, SlideComponentType } from '@/lib/slide-data';
import { getNextSlideId, getPrevSlideId } from '@/lib/slide-data';
import styles from '@/styles/Slide.module.css';
import { TitleSlide, BulletPointSlide, ImageSlide, CodeSlide } from '@/components/slides/SlideComponents';

// Dynamic imports for the demo components
import dynamic from 'next/dynamic';

interface SlideContentProps {
  slide: Slide;
}

export default function SlideContent({ slide }: SlideContentProps) {
  // Use dynamic import for demo components with loading state
  const Demo1 = dynamic(() => import('@/components/demos/demo-1/Demo1'), {
    loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading Demo 1...</div>
  });
  
  const Demo2 = dynamic(() => import('@/components/demos/demo-2/Demo2'), {
    loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading Demo 2...</div>
  });
  
  const Demo3 = dynamic(() => import('@/components/demos/demo-3/Demo3'), {
    loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading Demo 3...</div>
  });
  
  // Determine which demo component to render
  const getDemoComponent = () => {
    if (!slide.demoId) return null;
    
    switch (slide.demoId) {
      case 'demo-1': return <Demo1 />;
      case 'demo-2': return <Demo2 />;
      case 'demo-3': return <Demo3 />;
      default: return <div>Demo {slide.demoId} not found</div>;
    }
  };

  // Render slide content based on its type
  const renderContent = () => {
    if (!slide.content) return null;
    
    if (typeof slide.content === 'string') {
      // Render HTML string content
      return <div dangerouslySetInnerHTML={{ __html: slide.content }} />;
    } else {
      // It's a SlideComponentData object
      const componentData = slide.content as SlideComponentData;
      
      // Render the appropriate component based on the type
      switch (componentData.type) {
        case 'title':
          return <TitleSlide 
            title={componentData.props.title || ''}
            subtitle={componentData.props.subtitle}
          />;
          
        case 'bullets':
          return <BulletPointSlide 
            title={componentData.props.title || ''}
            points={componentData.props.points || []}
          />;
          
        case 'image':
          return <ImageSlide 
            title={componentData.props.title || ''}
            imagePath={componentData.props.imagePath || ''}
            caption={componentData.props.caption}
            width={componentData.props.width}
            height={componentData.props.height}
          />;
          
        case 'code':
          return <CodeSlide 
            title={componentData.props.title || ''}
            code={componentData.props.code || ''}
            language={componentData.props.language}
          />;
          
        case 'custom':
          // For custom components, we expect a 'component' prop
          if (componentData.props.component) {
            return componentData.props.component;
          }
          return <div>Custom component not provided</div>;
          
        default:
          return <div>Unknown component type: {componentData.type}</div>;
      }
    }
  };

  // Create the slide container style with background image if present
  const slideContainerStyle = slide.backgroundImage ? {
    backgroundImage: `url(${slide.backgroundImage})`,
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    margin: 0,
    padding: 0,
  } : {};

  return (
    <div className={slide.backgroundImage ? styles.slideWithBackground : ''} 
         style={{
           ...slideContainerStyle,
           width: '100%', 
           height: '100%', 
           padding: 0, 
           margin: 0,
           boxSizing: 'border-box',
           position: 'relative',
           backgroundSize: 'cover',
           backgroundPosition: 'center'
         }}>
      {/* Display speaker notes if available */}
      {slide.notes && (
        <aside className={"notes"} style={{ display: 'none' }}>
          {slide.notes}
        </aside>
      )}
      
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        position: 'relative',
        zIndex: '1'
      }}>
        {slide.type === 'content' && (
          <div className={styles['content-slide']} style={{ 
            color: slide.backgroundImage ? 'white' : '#333',
          }}>
            {renderContent()}
          </div>
        )}
        
        {slide.type === 'demo' && (
          <div style={{ width: '100%', height: '100%' }}>
            {getDemoComponent()}
          </div>
        )}
      </div>
      <div style={{ position: 'fixed', bottom: '10px', left: '0', right: '0', textAlign: 'center', zIndex: '100' }}>
        <p style={{ fontSize: '0.8rem', color: slide.backgroundImage ? 'white' : '#666', margin: '0' }}>
          Use keyboard arrows to navigate: ← Previous | Next →
        </p>
      </div>
    </div>
  );
}
