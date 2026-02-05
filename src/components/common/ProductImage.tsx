import { useState, useEffect } from 'react';
import { Package, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackSize?: number;
}

export function ProductImage({ 
  src, 
  alt, 
  className,
  containerClassName,
  fallbackSize = 24
}: ProductImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (src) {
      setImageSrc(src);
      setIsLoading(true);
      setHasError(false);
    } else {
      setIsLoading(false);
      setHasError(true);
    }
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className={cn("relative overflow-hidden bg-muted/30 flex items-center justify-center border", containerClassName)}>
      {isLoading && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      
      {!hasError && imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300", 
            isLoading ? "opacity-0" : "opacity-100",
            className
          )}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-muted-foreground/50 p-2">
          {src ? (
            <ImageOff size={fallbackSize} />
          ) : (
            <Package size={fallbackSize} />
          )}
        </div>
      )}
    </div>
  );
}
