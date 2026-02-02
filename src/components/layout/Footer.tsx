import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, Instagram } from 'lucide-react';
import sentraLogo from '@/assets/sentra-logo.png';
export const Footer = () => {
  return <footer className="bg-foreground text-background mt-20">
      <div className="container mx-auto px-4 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1 space-y-6">
            <img src={sentraLogo} alt="Sentra" className="h-7 w-auto brightness-0 invert opacity-90" />
            <p className="text-sm text-background/60 leading-relaxed max-w-xs">
              Curating exceptional fragrances for the discerning collector. 
              Every scent tells a story.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-xs uppercase tracking-[0.2em] font-medium text-background/40">
              Explore
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/products" className="text-sm text-background/60 hover:text-background transition-colors">
                  Collection
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-sm text-background/60 hover:text-background transition-colors">
                  Sentra Circles
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-background/60 hover:text-background transition-colors">
                  Affiliate Programme
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h4 className="text-xs uppercase tracking-[0.2em] font-medium text-background/40">
              Support
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-background/60 hover:text-background transition-colors">
                  Shipping Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-background/60 hover:text-background transition-colors">
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-background/60 hover:text-background transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-background/60 hover:text-background transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h4 className="text-xs uppercase tracking-[0.2em] font-medium text-background/40">
              Contact
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-background/40 flex-shrink-0 mt-0.5" />
                <address className="text-sm text-background/60 not-italic">
                  57 Ebitu Street, Jabi<br />
                  Abuja, Nigeria
                </address>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-background/40 flex-shrink-0" />
                <a href="tel:+2348053059824" className="text-sm text-background/60 hover:text-background transition-colors">
                  +234 8053059824
                </a>
              </li>
              <li className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-background/40 flex-shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <a href="https://wa.me/2348053059824" target="_blank" rel="noopener noreferrer" className="text-sm text-background/60 hover:text-background transition-colors">
                  Chat on WhatsApp
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-background/40 flex-shrink-0" />
                <a href="mailto:hello@sentra.com" className="text-sm text-background/60 hover:text-background transition-colors">
                  support@sentra.africa
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Instagram className="h-4 w-4 text-background/40 flex-shrink-0" />
                <a href="https://instagram.com/sentraafrica" target="_blank" rel="noopener noreferrer" className="text-sm text-background/60 hover:text-background transition-colors">
                  @sentraafrica
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-background/10">
          <p className="text-xs text-background/30 text-center tracking-wider">
            © {new Date().getFullYear()} SENTRA. All rights reserved.
          </p>
        </div>
      </div>
    </footer>;
};