import { useEffect, useRef, useState } from 'react';

import type { CatalogSpecies } from '../data/catalog';

/**
 * Søgbar, grupperet artsvælger.
 *
 * En almindelig <select> holder fint til de 7 kernearter, men Tier 2
 * (fællesskabsarter, se docs/roadmap.md) vokser med hver ny AI-identifikation
 * — en flad dropdown med 30+ latinske navne bliver hurtigt ubrugelig. Denne
 * erstatter kun Art-feltet i Log et fund; Jager-vælgeren i SpotPanel bruger
 * bevidst stadig en almindelig <select>, da den er begrænset til kernearter
 * for altid (rangeringen forudsætter data, Tier 2 ikke har).
 */
export function SpeciesPicker({
  id, species, value, onChange,
}: {
  id?: string;
  species: CatalogSpecies[];
  value: string;
  onChange: (nameDa: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = (s: CatalogSpecies) =>
    !q || s.nameDa.toLowerCase().includes(q) || s.nameLat.toLowerCase().includes(q);

  const core = species.filter((s) => s.reviewed !== false && matches(s));
  const community = species.filter((s) => s.reviewed === false && matches(s));
  const flat = [...core, ...community];

  const pick = (nameDa: string) => {
    onChange(nameDa);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      e.currentTarget.blur();
    } else if (e.key === 'Enter' && flat[0]) {
      e.preventDefault();
      pick(flat[0].nameDa);
    }
  };

  const group = (label: string, list: CatalogSpecies[]) =>
    list.length > 0 && (
      <div key={label}>
        <div className="species-pick-group">{label}</div>
        {list.map((s) => (
          <button
            type="button"
            key={s.nameDa}
            className={`species-pick-opt${s.nameDa === value ? ' sel' : ''}`}
            onMouseDown={(e) => e.preventDefault()} // undgå blur/close før klikket når frem
            onClick={() => pick(s.nameDa)}
          >
            {s.nameDa}
            <i>{s.nameLat}</i>
          </button>
        ))}
      </div>
    );

  return (
    <div className="species-pick" ref={rootRef}>
      <input
        id={id}
        type="text"
        className="species-pick-input"
        role="combobox"
        aria-expanded={open}
        aria-controls={id ? `${id}-menu` : undefined}
        autoComplete="off"
        placeholder="Søg art — dansk eller latin…"
        value={open ? query : value}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div className="species-pick-menu" id={id ? `${id}-menu` : undefined} role="listbox">
          {flat.length === 0 && <div className="species-pick-empty">Ingen art matcher "{query}"</div>}
          {group('Kernearter', core)}
          {group('Fællesskabsarter · AI, ikke verificeret', community)}
        </div>
      )}
    </div>
  );
}
