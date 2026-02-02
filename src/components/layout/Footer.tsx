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