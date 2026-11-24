import { forwardRef, useEffect, useState, type ReactNode } from 'react';
import { STAGE } from '../theme.ts';

function fit(): number {
  return Math.min(window.innerWidth / STAGE.width, window.innerHeight / STAGE.height);
}

/** A fixed 1920x1080 canvas, scaled to fit the window and letterboxed. */
export const Stage = forwardRef<HTMLDivElement, { children: ReactNode }>(function Stage({ children }, ref) {
  const [scale, setScale] = useState(fit);

  useEffect(() => {
    const onResize = () => setScale(fit());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="viewport">
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
