import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js to always download models
env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_IMAGE_DIMENSION = 512;
const CACHE_PREFIX = 'bg-removed-';

// Simple in-memory cache for processed images
const processedCache = new Map<string, string>();

function resizeImageIfNeeded(
  canvas: HTMLCanvasElement, 
  ctx: CanvasRenderingContext2D, 
  image: HTMLImageElement
): boolean {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    return true;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0);
  return false;
}

let segmenterInstance: any = null;
let segmenterLoading = false;
const segmenterQueue: Array<() => void> = [];

async function getSegmenter() {
  if (segmenterInstance) return segmenterInstance;
  
  if (segmenterLoading) {
    return new Promise<any>((resolve) => {
      segmenterQueue.push(() => resolve(segmenterInstance));
    });
  }
  
  segmenterLoading = true;
  
  try {
    segmenterInstance = await pipeline(
      'image-segmentation', 
      'Xenova/segformer-b0-finetuned-ade-512-512',
      { device: 'webgpu' }
    );
  } catch {
    // Fallback to CPU if WebGPU not available
    segmenterInstance = await pipeline(
      'image-segmentation', 
      'Xenova/segformer-b0-finetuned-ade-512-512'
    );
  }
  
  segmenterLoading = false;
  segmenterQueue.forEach(cb => cb());
  segmenterQueue.length = 0;
  
  return segmenterInstance;
}

export async function removeBackground(imageUrl: string): Promise<string> {
  // Check memory cache first
  if (processedCache.has(imageUrl)) {
    return processedCache.get(imageUrl)!;
  }
  
  // Check localStorage cache
  const cacheKey = CACHE_PREFIX + btoa(imageUrl).slice(0, 32);
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    processedCache.set(imageUrl, cached);
    return cached;
  }

  // Load the image
  const img = await loadImage(imageUrl);
  
  // Create canvas and process
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  resizeImageIfNeeded(canvas, ctx, img);
  const imageData = canvas.toDataURL('image/jpeg', 0.8);
  
  // Get segmenter and process
  const segmenter = await getSegmenter();
  const result = await segmenter(imageData);
  
  if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
    throw new Error('Invalid segmentation result');
  }
  
  // Create output canvas
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = canvas.width;
  outputCanvas.height = canvas.height;
  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) throw new Error('Could not get output canvas context');
  
  outputCtx.drawImage(canvas, 0, 0);
  
  // Apply mask
  const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const data = outputImageData.data;
  
  for (let i = 0; i < result[0].mask.data.length; i++) {
    const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
    data[i * 4 + 3] = alpha;
  }
  
  outputCtx.putImageData(outputImageData, 0, 0);
  
  // Convert to data URL
  const processedUrl = outputCanvas.toDataURL('image/png', 1.0);
  
  // Cache the result
  processedCache.set(imageUrl, processedUrl);
  try {
    localStorage.setItem(cacheKey, processedUrl);
  } catch {
    // localStorage might be full, ignore
  }
  
  return processedUrl;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Check if background removal is supported
export function isBackgroundRemovalSupported(): boolean {
  return typeof window !== 'undefined' && 'Worker' in window;
}
