/** Things on stage that are HTML rather than SVG: titles and code. Animate them by id like any actor. */
import type { CSSProperties, ReactNode } from 'react';

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
