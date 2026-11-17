import type { LoadedImage } from '../types';

export async function decodeImageFile(file: File): Promise<LoadedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file such as PNG, JPG, WebP, or AVIF.');
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  return {
    file,
    bitmap,
    url: URL.createObjectURL(file),
    width: bitmap.width,
    height: bitmap.height,
  };
}

export function releaseImage(image: LoadedImage | null): void {
  if (!image) {
    return;
  }
  image.bitmap.close();
  URL.revokeObjectURL(image.url);
}
