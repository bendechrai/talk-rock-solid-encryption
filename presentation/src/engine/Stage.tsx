import { forwardRef, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { STAGE } from '../theme.ts';

/**
 * A fixed 1920x1080 canvas, scaled to fit and letterboxed. It fills the window unless the page
 * gives it a smaller box to sit in, as the notes window does for its two slides.
 */
export const Stage = forwardRef<HTMLDivElement, { children: ReactNode }>(function Stage({ children }, ref) {
  const viewport = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(() => Math.min(window.innerWidth / STAGE.width, window.innerHeight / STAGE.height));

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const fit = () => setScale(Math.min(element.clientWidth / STAGE.width, element.clientHeight / STAGE.height));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="viewport" ref={viewport}>
      <div
        ref={ref}
        className="stage"
        style={{ width: STAGE.width, height: STAGE.height, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
});

/** The SVG layer that actors live in. Its coordinates are stage pixels. */
export function Svg({ children }: { children: ReactNode }) {
  return (
    <svg className="layer" viewBox={`0 0 ${STAGE.width} ${STAGE.height}`} width={STAGE.width} height={STAGE.height}>
      {children}
    </svg>
  );
}
