import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  fileType?: string;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 1200,
  quality: 0.8,
  fileType: 'image/webp',
};

export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  const compressionOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    useWebWorker: true,
    initialQuality: options.quality ?? DEFAULT_OPTIONS.quality,
  };

  try {
    const compressedFile = await imageCompression(file, compressionOptions);
    
    const originalSizeKB = (file.size / 1024).toFixed(2);
    const compressedSizeKB = (compressedFile.size / 1024).toFixed(2);
    const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
    
    console.log(
      `Image compressed: ${originalSizeKB}KB → ${compressedSizeKB}KB (${compressionRatio}% reduction)`
    );
    
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error('Failed to compress image. Please try again.');
  }
};

export const compressImages = async (
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> => {
  const compressionPromises = files.map((file) => compressImage(file, options));
  return Promise.all(compressionPromises);
};
