import type { ReactNode } from 'react';
import type { Scene } from '../engine/types.ts';

/** A full-screen title that opens a section of the talk. Wrap the words to emphasise in <em>. */
export function sectionTitle(id: string, title: string, heading: ReactNode, notes?: string): Scene {
  return {
    id,
    title,
    notes,
    View: () => <h1 className="section-title"><span>{heading}</span></h1>,
    steps: [],
  };
}
