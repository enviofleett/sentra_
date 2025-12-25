import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, Instagram } from 'lucide-react';
import sentraLogo from '@/assets/sentra-logo.png';

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground mt-20">
      <div className="container mx-auto px-4 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1 space-y-6">
            <img 
              src={sentraLogo} 
              alt="Sentra" 
              className="h-8 w-auto brightness-0 invert opacity-90"
            />
            <p className="text-sm text-primary-foreground/70 leading-relaxed max-w-xs">
              Curating exceptional fragrances for the discerning collector. 
              Every scent tells a story.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-xs uppercase tracking-[0.2em] font-medium text-primary-foreground/50">
              Explore
            </h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/products" 
                  className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
                >
                  Collection
                </Link>
              </li>
              <li>
                <Link 
                  to="/products" 
                  className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
                >
                  Sentra Circles
                </Link>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
                >
                  Affiliate Programme
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h4 className="text-xs uppercase tracking-[0.2em] font-medium text-primary-foreground/50">
              Support
            </h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="#" 
                  className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
                >
                  Shipping Policy
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
                >
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h4 className="text-xs uppercase tracking-[0.2em] font-medium text-primary-foreground/50">
              Contact
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                <address className="text-sm text-primary-foreground/70 not-italic">
                  57 Ebitu Street, Jabi<br />
                  Abuja, Nigeria
                </address>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-secondary flex-shrink-0" />
                <a 
                  href="tel:+2341234567890" 
                  className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
                >
                  +234 123 456 7890
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-secondary flex-shrink-0" />
                <a 
                  href="mailto:hello@sentra.com" 
                  className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
                >
                  hello@sentra.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Instagram className="h-4 w-4 text-secondary flex-shrink-0" />
                <a 
                  href="https://instagram.com/sentra" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
                >
                  @sentra
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-primary-foreground/10">
          <p className="text-xs text-primary-foreground/40 text-center tracking-wider">
            © {new Date().getFullYear()} SENTRA. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
