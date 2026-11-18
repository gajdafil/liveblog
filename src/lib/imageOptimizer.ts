import { supabase } from './supabase';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_RAW_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_DIMENSION_PX = 1920;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `Nepodporovaný formát souboru (${file.type || 'neznámý'}). Povoleny jsou JPEG, PNG, WebP a GIF.`;
  }
  if (file.size > MAX_RAW_SIZE_BYTES) {
    return `Soubor je příliš velký (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximální velikost je 10 MB.`;
  }
  return null;
}

export async function optimizeImageForUpload(file: File): Promise<{ blob: Blob; mimeType: string; ext: string }> {
  // Animované GIFy ponecháme beze změny, aby se zachovala animace
  if (file.type === 'image/gif') {
    return { blob: file, mimeType: 'image/gif', ext: 'gif' };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION_PX) / width);
          width = MAX_DIMENSION_PX;
        } else {
          width = Math.round((width * MAX_DIMENSION_PX) / height);
          height = MAX_DIMENSION_PX;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Nepodařilo se inicializovat grafický kontext pro optimalizaci obrázku.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Komprese obrázku selhala.'));
            return;
          }
          resolve({ blob, mimeType: 'image/webp', ext: 'webp' });
        },
        'image/webp',
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Obrázek se nepodařilo načíst.'));
    };

    img.src = objectUrl;
  });
}

export async function uploadBroadcastImage(
  broadcastId: string,
  file: File
): Promise<{ storagePath: string; publicUrl: string; mimeType: string; sizeBytes: number }> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const optimized = await optimizeImageForUpload(file);
  const fileName = `${crypto.randomUUID()}.${optimized.ext}`;
  const storagePath = `${broadcastId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('broadcast-media')
    .upload(storagePath, optimized.blob, {
      contentType: optimized.mimeType,
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Chyba při nahrávání do úložiště: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('broadcast-media')
    .getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: urlData.publicUrl,
    mimeType: optimized.mimeType,
    sizeBytes: optimized.blob.size,
  };
}

export async function deleteBroadcastImage(storagePath: string): Promise<void> {
  await supabase.storage.from('broadcast-media').remove([storagePath]);
}
