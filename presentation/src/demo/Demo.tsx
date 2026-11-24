import { useState } from 'react';
import type { Scene } from '../engine/types.ts';
import { cast } from '../theme.ts';
import { Inspector, ResetButton } from './Inspector.tsx';
import { Badge, Phone } from './Phone.tsx';
import type { Protocol } from './protocols.ts';
import './demo.css';

function Demo({ heading, protocol }: { heading: string; protocol: Protocol }) {
  const [users, setUsers] = useState<[string, string]>([cast.alice.id, cast.bob.id]);
  const [inspecting, setInspecting] = useState(false);
  /** While the server view is open there is only room for one phone at full size. */
  const [front, setFront] = useState<0 | 1>(0);

  const setUser = (index: 0 | 1, userId: string) => {
    setUsers((current) => (index === 0 ? [userId, current[1]] : [current[0], userId]));
    setFront(index);
  };

  return (
    <div className="demo">
      <header className="demo-header">
        <h1>{heading}</h1>
        {inspecting && (
          <div className="phone-picker" role="group" aria-label="Phone to show">
            {([0, 1] as const).map((index) => (
              <button key={index} type="button" className={front === index ? 'pick active' : 'pick'} aria-pressed={front === index} onClick={() => setFront(index)}>
                <Badge userId={users[index]} size={48} />
              </button>
            ))}
          </div>
        )}
        {inspecting && <ResetButton />}
        <button type="button" className="ghost" aria-pressed={inspecting} onClick={() => setInspecting(!inspecting)}>
          {inspecting ? 'Phones' : 'Behind the scenes'}
        </button>
      </header>
      <div className="demo-body">
        {/* Both phones stay mounted so neither loses its place when one is tucked away. */}
        <Phone protocol={protocol} userId={users[0]} onUserChange={(id) => setUser(0, id)} hidden={inspecting && front !== 0} />
        <Phone protocol={protocol} userId={users[1]} onUserChange={(id) => setUser(1, id)} hidden={inspecting && front !== 1} />
        {inspecting && <Inspector protocol={protocol} />}
      </div>
    </div>
  );
}

/** A live demo as a scene: the real chat app running against the real server. */
export function demoScene(id: string, heading: string, protocol: Protocol, notes?: string): Scene {
  return { id, title: heading, notes, View: () => <Demo heading={heading} protocol={protocol} />, steps: [] };
}
