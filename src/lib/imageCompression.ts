/**
 * Utility to compress and optimize images client-side before storage or upload.
 * Reduces raw camera photo sizes (3MB - 10MB) down to ~40KB - 90KB using modern WebP format
 * with seamless JPEG fallback, maintaining HD clarity and sharpness for bird photos.
 */

function getBestMimeType(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const testUrl = canvas.toDataURL('image/webp');
    if (testUrl.startsWith('data:image/webp')) {
      return 'image/webp';
    }
  } catch {}
  return 'image/jpeg';
}

export async function compressImage(
  file: File | string,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.80
): Promise<string> {
  const preferredMime = getBestMimeType();

  return new Promise((resolve, reject) => {
    const processImg = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Proportional scaling
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          img.src = '';
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Enable high-quality image smoothing algorithms
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Background fill for transparent PNGs
        ctx.fillStyle = '#121214';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = '';
        try {
          dataUrl = canvas.toDataURL(preferredMime, quality);
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Desaloca memória de bitmap imediatamente para o Garbage Collector
        canvas.width = 0;
        canvas.height = 0;
        img.onload = null;
        img.onerror = null;
        img.src = '';

        resolve(dataUrl);
      };

      img.onerror = (error) => {
        img.src = '';
        reject(error);
      };
    };

    if (typeof file === 'string') {
      processImg(file);
    } else {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        if (event.target?.result) {
          processImg(event.target.result as string);
        } else {
          reject(new Error('FileReader returned empty result'));
        }
      };
      reader.onerror = (error) => reject(error);
    }
  });
}

/**
 * Compresses an image directly to a binary Blob for high-performance upload to Supabase Storage.
 * Avoids the 33% base64 size penalty and loads faster over mobile networks.
 */
export async function compressImageToBlob(
  file: File | string,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.80
): Promise<{ blob: Blob; mimeType: string }> {
  const preferredMime = getBestMimeType();

  return new Promise((resolve, reject) => {
    const processImg = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Proportional scaling
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          img.src = '';
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#121214';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const cleanup = () => {
          canvas.width = 0;
          canvas.height = 0;
          img.onload = null;
          img.onerror = null;
          img.src = '';
        };

        if (canvas.toBlob) {
          canvas.toBlob(
            (blob) => {
              cleanup();
              if (blob) {
                resolve({ blob, mimeType: preferredMime });
              } else {
                // Fallback via dataUrl
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                const byteString = atob(dataUrl.split(',')[1]);
                const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i);
                }
                resolve({ blob: new Blob([ab], { type: mimeString }), mimeType: mimeString });
              }
            },
            preferredMime,
            quality
          );
        } else {
          const dataUrl = canvas.toDataURL(preferredMime, quality);
          cleanup();
          const byteString = atob(dataUrl.split(',')[1]);
          const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          resolve({ blob: new Blob([ab], { type: mimeString }), mimeType: mimeString });
        }
      };

      img.onerror = (error) => {
        img.src = '';
        reject(error);
      };
    };

    if (typeof file === 'string') {
      processImg(file);
    } else {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        if (event.target?.result) {
          processImg(event.target.result as string);
        } else {
          reject(new Error('FileReader returned empty result'));
        }
      };
      reader.onerror = (error) => reject(error);
    }
  });
}
