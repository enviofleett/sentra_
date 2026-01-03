import { useState } from 'react';
import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  enableBackgroundRemoval?: boolean;
}

export function ProductImage({ 
  src, 
  alt, 
  className,
  enableBackgroundRemoval = true 
}: ProductImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { processedUrl, isProcessing } = useBackgroundRemoval(
    enableBackgroundRemoval ? src : null
  );

  const displayUrl = processedUrl || src;

  return (
    <div className={cn("relative", className)}>
      {/* Show original image first, then fade to processed */}
      <img
        src={displayUrl || '/placeholder.svg'}
        alt={alt}
        className={cn(
          "w-full h-full object-contain transition-all duration-500",
          imageLoaded ? "opacity-100" : "opacity-0",
          isProcessing && "animate-pulse"
        )}
        onLoad={() => setImageLoaded(true)}
        loading="lazy"
      />
      
      {/* Placeholder while loading */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-muted/20 animate-pulse" />
      )}
    </div>
  );
}
