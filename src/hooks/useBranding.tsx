import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BrandingContextType {
  logoUrl: string;
  faviconUrl: string;
  loading: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const { data } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', ['branding_logo_url', 'branding_favicon_url']);

      if (data) {
        data.forEach((item) => {
          const url = typeof item.value === 'string' ? item.value : '';
          if (item.key === 'branding_logo_url') {
            setLogoUrl(url);
          } else if (item.key === 'branding_favicon_url') {
            setFaviconUrl(url);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshBranding = async () => {
    await fetchBranding();
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  // Update favicon dynamically
  useEffect(() => {
    if (faviconUrl) {
      const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.setAttribute('rel', 'icon');
      link.setAttribute('href', faviconUrl);
      if (!document.querySelector("link[rel*='icon']")) {
        document.head.appendChild(link);
      }
    }
  }, [faviconUrl]);

  return (
    <BrandingContext.Provider value={{ logoUrl, faviconUrl, loading, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
