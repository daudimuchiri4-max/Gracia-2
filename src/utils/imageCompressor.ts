export interface ImageCompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
  maxSizeBytes?: number; // Target max size in bytes (e.g. 100KB)
}

/**
 * Compresses an image file or data URL into a compact, high-clarity base64 data URL
 * to prevent exceeding Firestore's 1MB document limit and ensure instantaneous saving.
 */
export function compressImage(
  fileOrDataUrl: File | string,
  options: ImageCompressOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 1200,
      maxHeight = 675,
      quality = 0.65,
      mimeType = 'image/jpeg',
      maxSizeBytes = 90 * 1024, // 90KB target limit per image
    } = options;

    const processDataUrl = (dataUrl: string) => {
      // If it's an SVG, data URL is already vector, return as-is
      if (dataUrl.startsWith('data:image/svg+xml')) {
        resolve(dataUrl);
        return;
      }

      // If it's a web URL (http/https), return as-is (tiny URL reference)
      if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      // CRITICAL: DO NOT set crossOrigin on data: or blob: URIs as it taints canvas in WebKit/Blink
      if (!dataUrl.startsWith('data:') && !dataUrl.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        try {
          let { width, height } = img;

          // Calculate aspect ratio preserving dimensions
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // White background for JPEG format
          if (mimeType === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Multi-pass compression to stay strictly within size limit for Firestore
          let currentQuality = quality;
          let compressed = canvas.toDataURL(mimeType, currentQuality);

          // If base64 is still larger than maxSizeBytes, step down quality/dimensions
          if (compressed.length > maxSizeBytes * 1.37 && currentQuality > 0.3) {
            currentQuality = 0.45;
            compressed = canvas.toDataURL(mimeType, currentQuality);
          }

          if (compressed.length > maxSizeBytes * 1.37 && (width > 800 || height > 450)) {
            const smallCanvas = document.createElement('canvas');
            smallCanvas.width = Math.round(width * 0.75);
            smallCanvas.height = Math.round(height * 0.75);
            const sCtx = smallCanvas.getContext('2d');
            if (sCtx) {
              if (mimeType === 'image/jpeg') {
                sCtx.fillStyle = '#FFFFFF';
                sCtx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);
              }
              sCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
              compressed = smallCanvas.toDataURL(mimeType, 0.45);
            }
          }

          resolve(compressed);
        } catch (err) {
          console.warn('Image compression fallback used:', err);
          // Return the original data URL if canvas manipulation encounters any issue
          resolve(dataUrl);
        }
      };

      img.onerror = (e) => {
        console.warn('Image load failed during compression, returning raw data:', e);
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    if (typeof fileOrDataUrl === 'string') {
      processDataUrl(fileOrDataUrl);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) {
          reject(new Error('Failed to read image data'));
          return;
        }
        processDataUrl(result);
      };
      reader.onerror = () => reject(new Error('FileReader failed to read image file'));
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}
