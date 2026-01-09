import { useEffect } from 'react';

interface MetaTagsConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

const defaultMeta = {
  title: 'Sentra - Luxury Perfumes',
  description: 'Discover luxury perfumes crafted to perfection. Shop our collection of premium fragrances at Sentra.',
  image: 'https://sentra.lovable.app/og-image.png',
  url: 'https://sentra.lovable.app/',
  type: 'website'
};

export function useMetaTags(config: MetaTagsConfig) {
  useEffect(() => {
    const { title, description, image, url, type } = { ...defaultMeta, ...config };

    // Update document title
    document.title = title;

    // Helper to update or create meta tag
    const updateMetaTag = (selector: string, content: string, attribute = 'content') => {
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (element) {
        element.setAttribute(attribute, content);
      }
    };

    // Update standard meta
    updateMetaTag('meta[name="description"]', description);

    // Update Open Graph tags
    updateMetaTag('meta[property="og:title"]', title);
    updateMetaTag('meta[property="og:description"]', description);
    updateMetaTag('meta[property="og:image"]', image);
    updateMetaTag('meta[property="og:url"]', url);
    updateMetaTag('meta[property="og:type"]', type);

    // Update Twitter tags
    updateMetaTag('meta[name="twitter:title"]', title);
    updateMetaTag('meta[name="twitter:description"]', description);
    updateMetaTag('meta[name="twitter:image"]', image);
    updateMetaTag('meta[name="twitter:url"]', url);

    // Cleanup: restore defaults on unmount
    return () => {
      document.title = defaultMeta.title;
      updateMetaTag('meta[name="description"]', defaultMeta.description);
      updateMetaTag('meta[property="og:title"]', defaultMeta.title);
      updateMetaTag('meta[property="og:description"]', defaultMeta.description);
      updateMetaTag('meta[property="og:image"]', defaultMeta.image);
      updateMetaTag('meta[property="og:url"]', defaultMeta.url);
      updateMetaTag('meta[property="og:type"]', defaultMeta.type);
      updateMetaTag('meta[name="twitter:title"]', defaultMeta.title);
      updateMetaTag('meta[name="twitter:description"]', defaultMeta.description);
      updateMetaTag('meta[name="twitter:image"]', defaultMeta.image);
      updateMetaTag('meta[name="twitter:url"]', defaultMeta.url);
    };
  }, [config.title, config.description, config.image, config.url, config.type]);
}
