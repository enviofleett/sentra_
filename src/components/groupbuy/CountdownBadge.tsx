import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface CountdownBadgeProps {
  expiryAt: string;
  className?: string;
}

export function CountdownBadge({ expiryAt, className }: CountdownBadgeProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiryAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // Set urgent when less than 24 hours remaining
      setIsUrgent(difference < 24 * 60 * 60 * 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiryAt]);

  if (!timeLeft || timeLeft === 'Expired') return null;

  return (
    <Badge 
      className={`${isUrgent ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-secondary text-secondary-foreground'} shadow-md ${className}`}
    >
      <Clock className="w-3 h-3 mr-1" />
      {timeLeft}
    </Badge>
  );
}
