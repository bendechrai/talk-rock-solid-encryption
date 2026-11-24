/**
 * The vocabulary scenes use to describe movement. Each helper adds to a step's timeline and
 * returns it, so calls can be chained. `at` is a GSAP position: '<' starts with the previous
 * animation, '+=0.2' leaves a gap, and so on.
 */
import type { Timeline } from './types.ts';

export interface Point {
  x: number;
  y: number;
}

type At = string | number | undefined;

/** Fade something in. */
export function show(tl: Timeline, target: string, at?: At, duration = 0.4): Timeline {
  return tl.to(target, { opacity: 1, duration, ease: 'power1.out' }, at);
}

/** Fade something out. */
export function hide(tl: Timeline, target: string, at?: At, duration = 0.3): Timeline {
  return tl.to(target, { opacity: 0, duration, ease: 'power1.in' }, at);
}

/** Bring something in with a small bounce, for things that are created rather than revealed. */
export function pop(tl: Timeline, target: string, at?: At): Timeline {
  return tl.fromTo(
    target,
    { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' },
    { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)', immediateRender: false },
    at,
  );
}

/** Draw attention to something that is already on stage. */
export function pulse(tl: Timeline, target: string, at?: At): Timeline {
  return tl.fromTo(
    target,
    { scale: 1, transformOrigin: '50% 50%' },
    { scale: 1.25, duration: 0.22, ease: 'power1.out', yoyo: true, repeat: 1, immediateRender: false },
    at,
  );
}

export interface FlyOptions {
  /** How far the curve bows away from the straight line, in pixels. Negative bows the other way. */
  bend?: number;
  duration?: number;
  at?: At;
  /** Reveal the actor as it sets off. Use for copies that start hidden on top of the original. */
  reveal?: boolean;
}

/**
 * Move an actor from one place to another along a cubic Bézier curve. Positions are top-left
 * corners, the same as an actor's x and y.
 */
export function fly(tl: Timeline, target: string, from: Point, to: Point, options: FlyOptions = {}): Timeline {
  const { bend = -60, duration = 0.9, at, reveal = false } = options;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  // The control points sit a quarter and three quarters of the way along, pushed sideways by `bend`.
  const nx = (-dy / length) * bend;
  const ny = (dx / length) * bend;
  const path = [
    from,
    { x: from.x + dx * 0.25 + nx, y: from.y + dy * 0.25 + ny },
    { x: from.x + dx * 0.75 + nx, y: from.y + dy * 0.75 + ny },
    to,
  ];
  if (reveal) tl.set(target, { opacity: 1, x: from.x, y: from.y }, at);
  return tl.to(target, { motionPath: { path, type: 'cubic' }, duration, ease: 'power2.inOut' }, reveal ? '>' : at);
}

export interface AlongOptions {
  duration?: number;
  at?: At;
  /** Portion of the route to travel, from 0 to 1. */
  start?: number;
  end?: number;
}

/** Send an actor along a <Flow>, centred on the line. The actor is revealed as it sets off. */
export function along(tl: Timeline, target: string, flow: string, options: AlongOptions = {}): Timeline {
  const { duration = 1.1, at, start = 0, end = 1 } = options;
  const motionPath = { path: flow, align: flow, alignOrigin: [0.5, 0.5], start, end };
  // Put the actor on the start of the route while it is still hidden, then reveal and send it.
  tl.set(target, { motionPath: { ...motionPath, end: start } }, at);
  tl.to(target, { opacity: 1, duration: 0.15 }, '>');
  return tl.to(target, { motionPath, duration, ease: 'power1.inOut' }, '>');
}

/** Move an actor in a straight line to a new top-left position. */
export function moveTo(tl: Timeline, target: string, to: Point, at?: At, duration = 0.5): Timeline {
  return tl.to(target, { x: to.x, y: to.y, duration, ease: 'power2.inOut' }, at);
}

/** Swap what a screen is showing. */
export function swap(tl: Timeline, from: string, to: string, at?: At): Timeline {
  tl.to(from, { opacity: 0, duration: 0.25, ease: 'power1.in' }, at);
  return tl.to(to, { opacity: 1, duration: 0.35, ease: 'power1.out' }, '>-0.05');
}
