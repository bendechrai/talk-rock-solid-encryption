import { useState } from 'react';
import type { Scene } from '../engine/types.ts';
import { cast } from '../theme.ts';
import { Inspector } from './Inspector.tsx';
import { Phone } from './Phone.tsx';
import type { Protocol } from './protocols.ts';
import './demo.css';

function Demo({ heading, protocol }: { heading: string; protocol: Protocol }) {
  const [inspecting, setInspecting] = useState(false);
  return (
    <div className={inspecting ? 'demo inspecting' : 'demo'}>
      <header className="demo-header">
        <h1>{heading}</h1>
        <button type="button" className="ghost" aria-pressed={inspecting} onClick={() => setInspecting(!inspecting)}>
          {inspecting ? 'Hide server' : 'Look inside the server'}
        </button>
      </header>
      <div className="demo-body">
        <div className="phones">
          <Phone protocol={protocol} initialUser={cast.alice.id} />
          <Phone protocol={protocol} initialUser={cast.bob.id} />
        </div>
        {inspecting && <Inspector protocol={protocol} />}
      </div>
    </div>
  );
}

/** A live demo as a scene: the real chat app running against the real server. */
export function demoScene(id: string, heading: string, protocol: Protocol, notes?: string): Scene {
  return { id, title: heading, notes, View: () => <Demo heading={heading} protocol={protocol} />, steps: [] };
}
