import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Deck } from './engine/Deck.tsx';
import { scenes } from './scenes/index.tsx';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Deck scenes={scenes} />
  </StrictMode>,
);
