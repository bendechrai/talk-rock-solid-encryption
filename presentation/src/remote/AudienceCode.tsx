import { followUrl, onlyLocal } from './link.ts';
import { QrCode } from './QrCode.tsx';
import './remote.css';

/**
 * Shown over the stage for the room to scan: the talk on their own screen, kept in step with the
 * stage. The code holds the follow token, which only listens, so it is safe to put on a projector.
 */
export function AudienceCode({ follow }: { follow: string }) {
  return (
    <aside className="audience-code">
      <QrCode text={followUrl(follow)} label="QR code for following the talk" />
      <div className="audience-code-text">
        <h2>Follow along</h2>
        <p>Scan for these slides on your own screen, in step with mine.</p>
        {onlyLocal() && (
          <p className="audience-code-warning" data-presenter>
            This address only works on this computer. Open the talk by an address the room can reach.
          </p>
        )}
      </div>
    </aside>
  );
}
