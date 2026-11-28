import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Deck } from './engine/Deck.tsx';
import { registerDevice, useDevice } from './remote/device.ts';
import { followFromUrl, tokenFromUrl } from './remote/link.ts';
import { Remote } from './remote/Remote.tsx';
import { scenes } from './scenes/index.tsx';
import { withoutDemos } from './scenes/watchDemo.tsx';
import './styles.css';

// The same app is the stage, the presenter's notes window or phone (opened from the pairing
// code), and the copy an audience member follows on their own screen (opened from the code shown
// to the room).
const remote = tokenFromUrl();
const follow = followFromUrl();

/** The stage, or a follower's copy of it. A browser not allowed into the demos gets a placeholder. */
function Talk() {
  const { demos } = useDevice();
  return <Deck scenes={demos ? scenes : withoutDemos(scenes)} follow={follow ?? undefined} />;
}

// Register this browser before drawing anything, so that whoever opens the stage first owns it:
// by the time a code is on screen for anyone else to scan, that has already happened.
void registerDevice(remote ? 'presenter' : follow ? 'audience' : 'stage').then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {remote ? <Remote scenes={scenes} token={remote} /> : <Talk />}
    </StrictMode>,
  );
});
