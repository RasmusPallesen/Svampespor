import { useEffect, useRef, useState } from 'react';

import { PLATFORMS, type PlatformKey } from '../data/catalog';
import { buildCaption, PLATFORM_MAX } from '../lib/share/caption';
import { drawCard } from '../lib/share/card';
import { useApp } from '../state/AppContext';

/** Dele-arket: kort, platformvalg, tekst. Vises kun når et fund er valgt. */
export function ShareSheet() {
  const { shareFind, closeShare, profile, weather, showToast } = useApp();
  const [platform, setPlatform] = useState<PlatformKey>('instagram');
  const [caption, setCaption] = useState('Skriver…');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobRef = useRef<Blob | null>(null);

  // Nulstil til Instagram, hver gang et nyt fund åbnes.
  useEffect(() => { if (shareFind) setPlatform('instagram'); }, [shareFind]);

  // Tegn kortet og skriv teksten, når fund eller platform skifter.
  useEffect(() => {
    if (!shareFind || !profile || !canvasRef.current) return;
    let alive = true;
    setCaption('Skriver…');
    drawCard(canvasRef.current, shareFind, platform, profile, weather[shareFind.spotId])
      .then((b) => { if (alive) blobRef.current = b; });
    buildCaption(shareFind, platform, profile).then((t) => { if (alive) setCaption(t); });
    return () => { alive = false; };
  }, [shareFind, platform, profile, weather]);

  if (!shareFind || !profile) return null;

  const plat = PLATFORMS.find((p) => p.k === platform)!;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      showToast('Tekst kopieret');
    } catch {
      showToast('Kunne ikke kopiere — markér teksten manuelt');
    }
  };

  const doShare = async () => {
    const file = blobRef.current ? new File([blobRef.current], 'svampespor.jpg', { type: 'image/jpeg' }) : null;
    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: caption });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    if (platform === 'facebook') {
      window.open('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fsvampespor.dk', '_blank', 'noopener');
      showToast('Teksten skal indsættes i Facebook');
      return;
    }
    const a = document.createElement('a');
    a.href = canvasRef.current!.toDataURL('image/jpeg', 0.92);
    a.download = `svampespor-${shareFind.species.toLowerCase().replace(/\s/g, '-')}.jpg`;
    a.click();
    showToast(`Kortet er hentet — åbn ${plat.n} og vælg det`);
  };

  return (
    <div className="sheet on" onClick={(e) => { if (e.target === e.currentTarget) closeShare(); }}>
      <div className="sheet-in">
        <div className="sheet-top">
          <b>Del dit fund</b>
          <button aria-label="Luk" onClick={closeShare}>×</button>
        </div>

        <canvas className="card-prev" ref={canvasRef} width={1080} height={1350} />

        <div className="plats">
          {PLATFORMS.map((p) => (
            <button key={p.k} className="plat" onClick={() => setPlatform(p.k)}
              style={p.k === platform ? { borderColor: 'var(--lichen)' } : undefined}>
              <span className="pi" style={p.k === platform ? { color: 'var(--gold)' } : undefined}>{p.ic}</span>
              <span className="pn">{p.n}</span>
            </button>
          ))}
        </div>

        <div className="cap-box">
          <div className="ct">{caption}</div>
          <div className="cm">
            <span>{plat.n} · tone tilpasset</span>
            <span>{caption.length} / {PLATFORM_MAX[platform]} tegn</span>
          </div>
        </div>

        <button className="btn" onClick={doShare}>Del på {plat.n}</button>
        <button className="btn ghost" onClick={copy} style={{ marginTop: 8 }}>Kopiér tekst</button>
        <p className="share-note">
          {plat.native
            ? `${plat.n.toUpperCase()} TAGER IMOD BILLEDET VIA TELEFONENS DELEFUNKTION. PÅ COMPUTER HENTES KORTET I STEDET.`
            : 'FACEBOOK ÅBNER I ET NYT VINDUE. TEKSTEN INDSÆTTES MANUELT.'}
        </p>
      </div>
    </div>
  );
}
