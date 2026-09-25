/**
 * Image Processing Web Worker (Off-Main-Thread)
 * Executa o processamento pesado de decodificação e compressão de imagens de alta resolução
 * fora da thread principal do navegador, garantindo 60/120 FPS sem nenhum frame drop na UI.
 */

self.onmessage = async (e: MessageEvent) => {
  const { id, fileOrBlob, maxWidth = 1000, maxHeight = 1000, quality = 0.80, preferredMime = 'image/webp' } = e.data;

  try {
    let sourceBlob: Blob;
    if (fileOrBlob instanceof Blob) {
      sourceBlob = fileOrBlob;
    } else if (typeof fileOrBlob === 'string' && fileOrBlob.startsWith('data:')) {
      // Converte dataURL para Blob dentro do worker
      const res = await fetch(fileOrBlob);
      sourceBlob = await res.blob();
    } else {
      throw new Error('Formato de imagem não suportado no Web Worker');
    }

    // Decodifica imagem nativamente via createImageBitmap fora da thread da UI
    const bitmap = await createImageBitmap(sourceBlob);
    let width = bitmap.width;
    let height = bitmap.height;

    // Redimensionamento proporcional
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

    // Desenha em OffscreenCanvas acelerado por GPU
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      throw new Error('Contexto 2D do OffscreenCanvas indisponível');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fundo escuro para transparências
    ctx.fillStyle = '#121214';
    ctx.fillRect(0, 0, width, height);

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // Converte para Blob WebP ou JPEG
    let outputBlob: Blob;
    try {
      outputBlob = await canvas.convertToBlob({ type: preferredMime, quality });
    } catch {
      outputBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    }

    // Converte para base64 dataUrl de forma assíncrona compatível com TypeScript
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error || new Error('Erro ao ler blob'));
      reader.readAsDataURL(outputBlob);
    });

    self.postMessage({
      id,
      success: true,
      dataUrl,
      blob: outputBlob,
      mimeType: outputBlob.type,
      sizeBytes: outputBlob.size,
      width,
      height
    });
  } catch (err: any) {
    self.postMessage({
      id,
      success: false,
      error: err?.message || 'Falha na compressão via Web Worker'
    });
  }
};

export {};
