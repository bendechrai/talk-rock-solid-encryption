/** Things on stage that are HTML rather than SVG: titles and code. Animate them by id like any actor. */
import type { CSSProperties, ReactNode } from 'react';
import { asset } from './assets.ts';
import { Art } from './index.tsx';

/** One of the drawings from ./svg, sized for use beside HTML text. `tint` sets its main colour. */
export function Icon({ name, size, tint }: { name: string; size: number; tint?: string }) {
  const { width, height } = asset(name);
  return (
    <svg className="icon" width={size} height={(size * height) / width} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <Art name={name} tint={tint} />
    </svg>
  );
}

export function SceneTitle({ children }: { children: ReactNode }) {
  return <h1 className="scene-title">{children}</h1>;
}

/**
 * A block of code. Wrap comments in <span className="dim"> and the calls that matter in
 * <span className="hl">. Keep it to a handful of lines: the audience reads it at 40 pixels.
 */
export function CodeCard({
  id, left, top, hidden = false, children,
}: {
  id?: string; left: number; top: number; hidden?: boolean; children: ReactNode;
}) {
  const style: CSSProperties = { left, top, opacity: hidden ? 0 : 1 };
  return <pre id={id} className="code-card" style={style}>{children}</pre>;
}
