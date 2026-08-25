/**
 * Browserens geolocation — kun kaldt når brugeren eksplicit har slået
 * positionslogning til (se AppContext, geoConsent). Se CLAUDE.md regel 3:
 * præcise koordinater må kun forlade enheden med eksplicit samtykke.
 */

export interface GeoPoint {
  lat: number;
  lon: number;
}

export class GeolocationError extends Error {}

export function getCurrentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeolocationError('Denne browser understøtter ikke positionering.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new GeolocationError('Adgang til din position blev afvist.'));
        } else if (err.code === err.TIMEOUT) {
          reject(new GeolocationError('Det tog for lang tid at finde din position.'));
        } else {
          reject(new GeolocationError('Kunne ikke hente din position.'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}
