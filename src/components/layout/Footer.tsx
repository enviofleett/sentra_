import { Link } from 'react-router-dom';
import { MapPin, Briefcase, HeadphonesIcon, Mail, Phone, Instagram } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';

export const Footer = () => {
  const { logoUrl } = useBranding();
  
  return (
    <footer className="bg-[#1a2332] text-white mt-20">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Address */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-orange-400 flex-shrink-0 mt-1" aria-hidden="true" />
              <div>
                <h4 className="font-semibold text-white mb-2">Headquarters:</h4>
                <address className="text-sm text-gray-300 not-italic leading-relaxed">
                  123 Luxury Avenue<br />
                  Victoria Island<br />
                  Lagos, Nigeria
                </address>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Briefcase className="h-5 w-5 text-orange-400 flex-shrink-0 mt-1" aria-hidden="true" />
              <div>
                <h4 className="font-semibold text-white mb-3">Services</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a 
                      href="#" 
                      className="text-gray-300 hover:text-orange-400 transition-colors"
                      aria-label="Join our affiliate programme"
                    >
                      Join affiliate programme
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Customer Support */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <HeadphonesIcon className="h-5 w-5 text-orange-400 flex-shrink-0 mt-1" aria-hidden="true" />
              <div>
                <h4 className="font-semibold text-white mb-3">Customer Support</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a 
                      href="#" 
                      className="text-gray-300 hover:text-orange-400 transition-colors"
                    >
                      Shipping Policy
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#" 
                      className="text-gray-300 hover:text-orange-400 transition-colors"
                    >
                      Terms & Conditions
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#" 
                      className="text-gray-300 hover:text-orange-400 transition-colors"
                    >
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#" 
                      className="text-gray-300 hover:text-orange-400 transition-colors"
                    >
                      FAQ
                    </a>
                  </li>
                  <li>
                    <Link 
                      to="/about" 
                      className="text-gray-300 hover:text-orange-400 transition-colors"
                    >
                      About Us
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Contact Us */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-orange-400 flex-shrink-0 mt-1" aria-hidden="true" />
              <div>
                <h4 className="font-semibold text-white mb-3">Contact Us</h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-orange-400" aria-hidden="true" />
                    <a 
                      href="tel:+2341234567890" 
                      className="text-gray-300 hover:text-orange-400 transition-colors"
                      aria-label="Call us at +234 123 456 7890"
                    >
                      +234 123 456 7890
                    </a>
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-orange-400" aria-hidden="true" />
                    <a 
                      href="mailto:info@sentra.com" 
                      className="text-gray-300 hover:text-orange-400 transition-colors"
                      aria-label="Email us at info@sentra.com"
                    >
                      info@sentra.com
                    </a>
                  </li>
                  <li className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-orange-400" aria-hidden="true" />
                    <a 
                      href="https://instagram.com/sentra" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-orange-400 transition-colors"
                      aria-label="Follow us on Instagram @sentra"
                    >
                      @sentra
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700 text-center">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Sentra Perfumes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};