import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import { remoteUrl } from './link.ts';
import './remote.css';

/** A QR code drawn as one SVG path, a module per unit, with the quiet zone it needs to scan. */
function QrCode({ text }: { text: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    let d = '';
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) d += `M${col + 4} ${row + 4}h1v1h-1z`;
      }
    }
    return { size: count + 8, path: d };
  }, [text]);

  return (
    <svg className="pairing-code" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code for the remote" shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

/**
 * Shown over the stage when the presenter presses R. Whoever scans the code can drive the talk,
 * so it is meant to be scanned before the screen is shared and it closes once a phone joins.
 */
export function Pairing({ token, remotes, onRenew, onClose }: {
  token: string; remotes: number; onRenew: () => void; onClose: () => void;
}) {
  const url = remoteUrl(token);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

  return (
    <aside className="pairing" data-presenter>
      <QrCode text={url} />
      <div className="pairing-text">
        <h2>Presenter remote</h2>
        <p>Scan this with your phone for notes, a timer and next and back.</p>
        <p className="pairing-url">{url}</p>
        {local && (
          <p className="pairing-warning">
            This address only works on this computer. Open the talk by a name or address your phone can reach, then
            press R again.
          </p>
        )}
        <p className="pairing-warning">Anyone who scans this can drive the slides. Pair before the audience can see the screen.</p>
        <p className="pairing-status">{remotes > 0 ? `${remotes} phone${remotes === 1 ? '' : 's'} connected` : 'Waiting for a phone'}</p>
        <div className="pairing-actions">
          <button type="button" onClick={onRenew}>New code</button>
          <button type="button" onClick={onClose}>Close (R)</button>
        </div>
      </div>
    </aside>
  );
}
