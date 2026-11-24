import type { ComponentType } from 'react';

/** A GSAP timeline that a step adds its animation to. */
export type Timeline = gsap.core.Timeline;

/**
 * One click of the clicker. `build` describes how the stage changes; the engine plays it when you
 * advance, and can also jump straight to the state before or after it.
 */
export interface Step {
  /** Speaker notes for the state this step leads to. */
  notes?: string;
  build?: (tl: Timeline) => void;
}

export interface Scene {
  /** Used in the URL, so keep it short and stable. */
  id: string;
  title: string;
  /** Speaker notes for the scene's opening state. */
  notes?: string;
  /** Everything that is ever on stage in this scene, including actors that start hidden. */
  View: ComponentType;
  /** The scene opens in its initial state; each step is one advance from there. */
  steps: Step[];
}

export interface Position {
  scene: number;
  /** 0 is the scene's opening state; n is the state after the nth step. */
  step: number;
}
