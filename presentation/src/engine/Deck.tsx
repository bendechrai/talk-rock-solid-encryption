/**
 * Plays a list of scenes. One advance (clicker, arrow key, space) plays one step.
 *
 * Each scene's steps are compiled into a single paused GSAP timeline with a label after every
 * step. Advancing plays to the next label; going back, reloading or following a link jumps
 * straight to a label, so the stage is always in an exact, repeatable state.
 */
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RemoteCommand } from '../remote/link.ts';
import { Pairing } from '../remote/Pairing.tsx';
import { useStageRemote } from '../remote/useStageRemote.ts';
import { Stage } from './Stage.tsx';
import type { Position, Scene } from './types.ts';

gsap.registerPlugin(MotionPathPlugin);

function clamp(scenes: Scene[], position: Position): Position {
  const scene = Math.min(Math.max(position.scene, 0), scenes.length - 1);
  const step = Math.min(Math.max(position.step, 0), scenes[scene].steps.length);
  return { scene, step };
}

function fromHash(scenes: Scene[]): Position {
  const [, id, step] = window.location.hash.split('/');
  const scene = scenes.findIndex((s) => s.id === id);
  return scene === -1 ? { scene: 0, step: 0 } : clamp(scenes, { scene, step: Number(step) || 0 });
}

/** Keys typed into a demo's text field must not drive the slides. */
function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

/** A tap on something that does a job of its own (a demo's buttons and fields) must not also turn the page. */
function isInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button, a, input, textarea, select, summary, label, [role="button"]') !== null;
}

/** Space and Enter on a focused button should press the button, not advance. */
function isControl(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ['BUTTON', 'A', 'SUMMARY'].includes(target.tagName);
}

export function Deck({ scenes }: { scenes: Scene[] }) {
  const [position, setPosition] = useState<Position>(() => fromHash(scenes));
  const [blank, setBlank] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [pairing, setPairing] = useState(false);

  const stage = useRef<HTMLDivElement>(null);
  const current = useRef(position);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const playing = useRef<gsap.core.Tween | null>(null);
  /** True only for a single forward step within a scene; everything else jumps. */
  const animateNext = useRef(false);

  const scene = scenes[position.scene];

  // The audit scripts in presentation/audit read this to visit every step of every scene.
  useEffect(() => {
    (window as unknown as { __deck?: unknown }).__deck = scenes.map((s) => ({
      id: s.id,
      title: s.title,
      steps: s.steps.length,
      notes: [s.notes, ...s.steps.map((step) => step.notes)].map((n) => n ?? ''),
    }));
  }, [scenes]);

  const moveTo = useCallback((next: Position, animate = false) => {
    const target = clamp(scenes, next);
    if (target.scene === current.current.scene && target.step === current.current.step) return;
    animateNext.current = animate;
    current.current = target;
    setPosition(target);
  }, [scenes]);

  const next = useCallback(() => {
    const { scene: s, step } = current.current;
    if (step < scenes[s].steps.length) moveTo({ scene: s, step: step + 1 }, true);
    else if (s < scenes.length - 1) moveTo({ scene: s + 1, step: 0 });
  }, [scenes, moveTo]);

  const previous = useCallback(() => {
    const { scene: s, step } = current.current;
    if (step > 0) moveTo({ scene: s, step: step - 1 });
    else if (s > 0) moveTo({ scene: s - 1, step: scenes[s - 1].steps.length });
  }, [scenes, moveTo]);

  // A phone opened from the pairing code reads the notes and sends next and back.
  const onCommand = useCallback((command: RemoteCommand) => {
    if (command.action === 'next') next();
    else if (command.action === 'previous') previous();
    else {
      const index = scenes.findIndex((s) => s.id === command.scene);
      if (index !== -1) moveTo({ scene: index, step: command.step });
    }
  }, [scenes, next, previous, moveTo]);
  const remote = useStageRemote({ scene: scene.id, step: position.step }, onCommand);
  const { pair } = remote;

  // The code is on screen only until a phone has it.
  const paired = remote.remotes > 0;
  useEffect(() => {
    if (paired) setPairing(false);
  }, [paired]);

  // Compile the scene's steps into one timeline whenever the scene changes.
  useLayoutEffect(() => {
    const context = gsap.context(() => {
      const master = gsap.timeline({ paused: true });
      master.addLabel('s0', 0);
      scene.steps.forEach((step, index) => {
        const stepTimeline = gsap.timeline();
        step.build?.(stepTimeline);
        // A step with no animation still needs its own moment on the timeline.
        if (stepTimeline.duration() === 0) stepTimeline.to({}, { duration: 0.01 });
        master.add(stepTimeline);
        master.addLabel(`s${index + 1}`, master.duration());
      });
      master.seek(`s${current.current.step}`, false);
      timeline.current = master;
    }, stage);
    return () => {
      playing.current?.kill();
      playing.current = null;
      timeline.current = null;
      context.revert();
    };
  }, [scene]);

  // Play or jump to the current step.
  useLayoutEffect(() => {
    const master = timeline.current;
    if (!master) return;
    const label = `s${position.step}`;
    if (animateNext.current) {
      // A second click while a step is still playing finishes it at once, then plays the next.
      if (playing.current?.isActive()) {
        playing.current.kill();
        master.seek(`s${position.step - 1}`, false);
      }
      playing.current = master.tweenTo(label, { ease: 'none' });
    } else {
      playing.current?.kill();
      master.pause();
      master.seek(label, false);
    }
    animateNext.current = false;
  }, [position]);

  // Keep the URL in step with the stage, and follow the URL if it is edited.
  useEffect(() => {
    const hash = `#/${scene.id}/${position.step}`;
    if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
  }, [scene, position.step]);

  useEffect(() => {
    const onHashChange = () => moveTo(fromHash(scenes));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [scenes, moveTo]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const typing = isTyping(event.target);
      const onControl = isControl(event.target);
      let handled = true;
      switch (event.key) {
        // Clickers send Page Down and Page Up. They always work, even while typing in a demo.
        case 'PageDown': next(); break;
        case 'PageUp': previous(); break;
        case 'ArrowRight': if (typing) return; next(); break;
        case 'ArrowLeft': if (typing) return; previous(); break;
        case ' ':
        case 'Enter': if (typing || onControl) return; next(); break;
        case 'Backspace': if (typing) return; previous(); break;
        case 'Home': if (typing) return; moveTo({ scene: 0, step: 0 }); break;
        case 'End': if (typing) return; moveTo({ scene: scenes.length - 1, step: Infinity }); break;
        // Many clickers have a "blank screen" button that sends B or a full stop.
        case 'b': case 'B': case '.': if (typing) return; setBlank((value) => !value); break;
        case 'n': case 'N': if (typing) return; setShowNotes((value) => !value); break;
        case 'r': case 'R': if (typing) return; pair(); setPairing((value) => !value); break;
        case 'f': case 'F':
          if (typing) return;
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen();
          break;
        default: handled = false;
      }
      if (handled) event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scenes, next, previous, moveTo, pair]);

  // On a touch screen with no keyboard, a tap on the right two thirds advances and a tap on the
  // left third goes back. Mice are left alone: the demos are full of things to click.
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    let down: { x: number; y: number; time: number } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      down = event.pointerType === 'touch' && event.isPrimary ? { x: event.clientX, y: event.clientY, time: event.timeStamp } : null;
    };
    const onPointerUp = (event: PointerEvent) => {
      const start = down;
      down = null;
      if (!start || isInteractive(event.target)) return;
      // A drag or a long press is not a tap.
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12 || event.timeStamp - start.time > 600) return;
      const { left, width } = element.getBoundingClientRect();
      if (event.clientX - left < width / 3) previous();
      else next();
    };
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointerup', onPointerUp);
    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointerup', onPointerUp);
    };
  }, [next, previous]);

  const notes = position.step === 0 ? scene.notes : scene.steps[position.step - 1]?.notes;

  return (
    <>
      <Stage ref={stage}>
        <div className="scene" key={scene.id}>
          <scene.View />
        </div>
        <div className="progress" aria-hidden="true">
          {position.scene + 1}/{scenes.length} · {position.step}/{scene.steps.length}
        </div>
      </Stage>
      {showNotes && (
        <aside className="notes">
          <strong>{scene.title}</strong>
          <p>{notes ?? 'No notes for this step.'}</p>
        </aside>
      )}
      {pairing && remote.token && (
        <Pairing token={remote.token} remotes={remote.remotes} onRenew={remote.renew} onClose={() => setPairing(false)} />
      )}
      {blank && <div className="blank" />}
    </>
  );
}
