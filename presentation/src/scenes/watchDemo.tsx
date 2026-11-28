import { SceneTitle } from '../art/html.tsx';
import type { Scene } from '../engine/types.ts';

function WatchView() {
  return (
    <>
      <SceneTitle>Live demo</SceneTitle>
      <p className="watch-demo">This one is happening on the big screen.</p>
    </>
  );
}

/**
 * The talk as an audience member follows it. The demos are live on the presenter's laptop and all
 * share one server, so a follower is shown a placeholder in their place rather than a second set
 * of phones that would write into the chat on stage.
 */
export function withoutDemos(scenes: Scene[]): Scene[] {
  return scenes.map((scene) => (scene.id.startsWith('demo-') ? { ...scene, View: WatchView } : scene));
}
