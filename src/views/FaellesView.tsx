import { SEED_FEED } from '../lib/data/seed';
import { useApp } from '../state/AppContext';

export function FaellesView() {
  const { sharing, setSharing } = useApp();

  return (
    <>
      <div className="panel">
        <div className="share-toggle">
          <div>
            <b style={{ fontSize: 14 }}>Del mine fund</b>
            <p>Andre ser art, dato og et cirka-område på 2 km. Din præcise plet forlader aldrig telefonen.</p>
          </div>
          <button
            className="switch"
            role="switch"
            aria-checked={sharing}
            aria-label="Del mine fund"
            onClick={() => setSharing(!sharing)}
          />
        </div>
      </div>

      <div className="panel">
        <div className="panel-label"><span>Sæsonens jagt</span><span style={{ color: 'var(--gold)' }}>Uge 35</span></div>
        <div className="bestday" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
          <div className="num">17</div>
          <div className="txt"><b>Årets første tragtkantarel</b>17 svampejægere har meldt fund i Nordsjælland i denne uge.</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-label">Seneste fund i dit område</div>
        {SEED_FEED.map((f, i) => (
          <div className="feed-item" key={i}>
            <div className="av">{f.avatar}</div>
            <div className="feed-body">
              <div className="feed-head"><b>{f.who}</b> <span>· {f.when}</span></div>
              <div className="feed-find">{f.species}</div>
              <div className="feed-loc">{f.location}</div>
              <div className="feed-tags">
                {f.tags.map((t, j) => <span key={j} className={`tag ${t.kind}`}>{t.text}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
