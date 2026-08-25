import type { Shot } from './types';

/**
 * Skalér et billede ned før upload — sparer båndbredde og gør analysen
 * hurtigere. Browser-only (canvas), derfor uden for den rene modelkode.
 */
export function shrink(file: File): Promise<Shot> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1120;
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * sc);
        canvas.height = Math.round(img.height * sc);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Kunne ikke tegne billedet'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ url, b64: url.split(',')[1] });
      };
      img.onerror = () => reject(new Error('Billedet kunne ikke læses'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Filen kunne ikke læses'));
    reader.readAsDataURL(file);
  });
}
