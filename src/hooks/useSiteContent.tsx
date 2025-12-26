import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteContent {
  [key: string]: string;
}

interface SiteBanner {
  id: string;
  section: string;
  title: string | null;
  subtitle: string | null;
  button_text: string | null;
  button_link: string | null;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

interface FeaturedBrand {
  id: string;
  name: string;
  logo_url: string;
  display_order: number;
  is_active: boolean;
}

export function useSiteContent(section?: string) {
  const [content, setContent] = useState<SiteContent>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      let query = supabase.from('site_content').select('*');
      
      if (section) {
        query = query.eq('section', section);
      }
      
      const { data, error } = await query;
      
      if (data && !error) {
        const contentMap: SiteContent = {};
        data.forEach((item: any) => {
          contentMap[`${item.section}.${item.content_key}`] = item.content_value;
        });
        setContent(contentMap);
      }
      setLoading(false);
    };

    fetchContent();
  }, [section]);

  const getContent = (section: string, key: string, fallback: string = '') => {
    return content[`${section}.${key}`] || fallback;
  };

  return { content, loading, getContent };
}

export function useSiteBanners(section?: string) {
  const [banners, setBanners] = useState<SiteBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      let query = supabase
        .from('site_banners')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (section) {
        query = query.eq('section', section);
      }
      
      const { data, error } = await query;
      
      if (data && !error) {
        setBanners(data as SiteBanner[]);
      }
      setLoading(false);
    };

    fetchBanners();
  }, [section]);

  const getBanner = (sectionName: string): SiteBanner | undefined => {
    return banners.find(b => b.section === sectionName);
  };

  const getBannersBySection = (sectionName: string): SiteBanner[] => {
    return banners.filter(b => b.section === sectionName);
  };

  return { banners, loading, getBanner, getBannersBySection };
}

export function useFeaturedBrands() {
  const [brands, setBrands] = useState<FeaturedBrand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      const { data, error } = await supabase
        .from('featured_brands')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (data && !error) {
        setBrands(data as FeaturedBrand[]);
      }
      setLoading(false);
    };

    fetchBrands();
  }, []);

  return { brands, loading };
}
