import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Deck } from './engine/Deck.tsx';
import { tokenFromUrl } from './remote/link.ts';
import { Remote } from './remote/Remote.tsx';
import { scenes } from './scenes/index.tsx';
import './styles.css';

// The same app is the stage and, opened from the stage's QR code, the presenter's remote.
const remote = tokenFromUrl();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {remote ? <Remote scenes={scenes} token={remote} /> : <Deck scenes={scenes} />}
  </StrictMode>,
);
