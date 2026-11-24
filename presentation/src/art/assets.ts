/**
 * Every drawing is a standalone SVG file in ./svg, so it can be opened and edited in any vector
 * tool. They are inlined at build time; the stage needs them in the DOM to animate them.
 */
const files = import.meta.glob<string>('./svg/*.svg', { query: '?raw', import: 'default', eager: true });

export interface Asset {
  width: number;
  height: number;
  /** A root-level fill, if the file declares one (keys use `currentColor`). */
  fill?: string;
  markup: string;
}

function parse(path: string, raw: string): Asset {
  const open = raw.match(/<svg\b([^>]*)>/);
  const viewBox = open?.[1].match(/viewBox="([^"]+)"/)?.[1].trim().split(/\s+/).map(Number);
  if (!open || !viewBox || viewBox.length !== 4) throw new Error(`${path} needs an <svg> root with a viewBox`);
  return {
    width: viewBox[2],
    height: viewBox[3],
    fill: open[1].match(/\sfill="([^"]+)"/)?.[1],
    markup: raw.slice(raw.indexOf('>', open.index) + 1, raw.lastIndexOf('</svg>')),
  };
}

export const assets: Record<string, Asset> = Object.fromEntries(
  Object.entries(files).map(([path, raw]) => [path.replace(/^.*\/([^/]+)\.svg$/, '$1'), parse(path, raw)]),
);

export function asset(name: string): Asset {
  const found = assets[name];
  if (!found) throw new Error(`No artwork named "${name}" in src/art/svg`);
  return found;
}
