import { useState } from 'react';
import { X } from 'lucide-react';
import { useSiteContent } from '@/hooks/useSiteContent';

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);
  const { getContent } = useSiteContent();
  
  const announcementText = getContent('announcement', 'text', 'FREE SHIPPING ON ORDERS OVER ₦50,000');

  if (!isVisible) return null;

  return (
    <div className="bg-coral text-coral-foreground py-2.5 px-4 text-center relative">
      <p className="text-xs sm:text-sm tracking-wide font-medium">
        {announcementText}
      </p>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:opacity-70 transition-opacity"
        aria-label="Close announcement"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
