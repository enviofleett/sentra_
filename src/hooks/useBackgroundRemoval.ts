import { useState, useEffect } from 'react';
import { removeBackground, isBackgroundRemovalSupported } from '@/utils/backgroundRemoval';

interface UseBackgroundRemovalResult {
  processedUrl: string | null;
  isProcessing: boolean;
  error: Error | null;
}

// Global processing queue to limit concurrent operations
const processingQueue: Array<() => Promise<void>> = [];
let activeProcessing = 0;
const MAX_CONCURRENT = 2;

async function processQueue() {
  if (activeProcessing >= MAX_CONCURRENT || processingQueue.length === 0) return;
  
  activeProcessing++;
  const task = processingQueue.shift();
  if (task) {
    await task();
  }
  activeProcessing--;
  processQueue();
}

function enqueueTask(task: () => Promise<void>) {
  processingQueue.push(task);
  processQueue();
}

export function useBackgroundRemoval(imageUrl: string | null | undefined): UseBackgroundRemovalResult {
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!imageUrl || !isBackgroundRemovalSupported()) {
      setProcessedUrl(null);
      return;
    }

    let cancelled = false;
    setIsProcessing(true);
    setError(null);

    const processImage = async () => {
      try {
        const result = await removeBackground(imageUrl);
        if (!cancelled) {
          setProcessedUrl(result);
          setIsProcessing(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to remove background'));
          setIsProcessing(false);
        }
      }
    };

    enqueueTask(processImage);

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return { processedUrl, isProcessing, error };
}
