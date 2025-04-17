import React from 'react';
import Image from 'next/image';
import styles from '@/styles/Slide.module.css';

/**
 * Title slide component with stylized content
 */
export const TitleSlide: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  return (
    <div className={styles.titleSlide}>
      <h1>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
};

/**
 * Content slide with bullet points
 */
export const BulletPointSlide: React.FC<{ title: string; points: string[] }> = ({ title, points }) => {
  return (
    <div>
      <h2>{title}</h2>
      <ul>
        {points.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Image slide with caption
 */
export const ImageSlide: React.FC<{ 
  title: string; 
  imagePath: string; 
  caption?: string;
  width?: number;
  height?: number;
}> = ({ title, imagePath, caption, width = 800, height = 500 }) => {
  return (
    <div>
      <h2>{title}</h2>
      <div className={styles.imageContainer}>
        <Image 
          src={imagePath} 
          alt={caption || title}
          width={width}
          height={height}
          style={{ objectFit: 'contain' }}
        />
        {caption && <p className={styles.imageCaption}>{caption}</p>}
      </div>
    </div>
  );
};

/**
 * Code snippet slide
 */
export const CodeSlide: React.FC<{ 
  title: string; 
  code: string;
  language?: string;
}> = ({ title, code, language = 'javascript' }) => {
  return (
    <div>
      <h2>{title}</h2>
      <pre className={`${styles.codeBlock} language-${language}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
};
