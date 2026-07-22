/**
 * Utility to compress and optimize images client-side before storage or upload.
 * Reduces raw camera photo sizes (3MB - 10MB) down to ~100KB - 180KB 
 * while maintaining HD clarity and sharpness for bird photos.
 */
export async function compressImage(
  file: File | string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82
): Promise<string> {
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

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.onerror = (error) => reject(error);
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
