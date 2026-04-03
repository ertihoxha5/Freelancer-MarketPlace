// src/components/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-y-10">
          <div>
            <div className="flex items-center gap-x-2 mb-6">
              <span className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 bg-clip-text text-transparent">
                Freelancer
              </span>
              <span className="text-2xl font-semibold text-white">MARKETPLACE</span>
            </div>
            <p className="text-sm">Connecting talent with opportunity worldwide.</p>
          </div>

          <div>
          
          </div>

          <div>
            <p className="font-medium text-white mb-4">Company</p>
            <div className="space-y-3 text-sm">
              <Link to="/features" className="block hover:text-white">Features</Link>
              <Link to="/about" className="block hover:text-white">About Us</Link>
              <a href="#" className="block hover:text-white">Blog</a>
              <a href="#" className="block hover:text-white">Careers</a>
              <a href="/contact" className="block hover:text-white">Contact</a>
            </div>
          </div>

          <div>
            <p className="font-medium text-white mb-4">Legal</p>
            <div className="space-y-3 text-sm">
              <a href="#" className="block hover:text-white">Privacy Policy</a>
              <a href="#" className="block hover:text-white">Terms of Service</a>
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 text-sm">
            © 2026 Freelancer Marketplace. All rights reserved.<br />
            Made with ❤️ in Pristina
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
