import { getCurrentPosition, type GeoPoint } from '../lib/geo/geolocation';
import { useApp } from './AppContext';

/**
 * Henter brugerens position, hvis positionslogning er slået til — ellers
 * null uden at spørge browseren om noget. Fejler blødt: en afvist eller
 * mislykket positionering viser en toast og lader fundet gemmes uden.
 */
export function useCaptureLocation() {
  const { logLocation, showToast } = useApp();
  return async (): Promise<GeoPoint | null> => {
    if (!logLocation) return null;
    try {
      return await getCurrentPosition();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Kunne ikke hente din position — fundet gemmes uden');
      return null;
    }
  };
}
