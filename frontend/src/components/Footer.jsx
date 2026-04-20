import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-[#1a3c2e] text-white/80 py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-y-12">
          
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-x-2 mb-6">
              <span className="text-3xl font-bold tracking-tighter text-[#a3c9a3]">
                Freelancer
              </span>
              <span className="text-2xl font-semibold text-white">MARKETPLACE</span>
            </div>
            <p className="text-sm leading-relaxed text-white/70 max-w-xs">
              Connecting exceptional talent with ambitious projects worldwide.
            </p>
            <div className="mt-8 text-xs text-white/50">
              © 2026 Freelancer Marketplace.<br />
              All rights reserved.
            </div>
          </div>

     <div></div>

          <div>
            <p className="font-semibold text-white mb-5 text-sm tracking-wider">COMPANY</p>
            <div className="space-y-3 text-sm">
              <Link to="/about" className="block hover:text-white transition-colors">About Us</Link>
              <a href="#" className="block hover:text-white transition-colors">Blog</a>
              <a href="#" className="block hover:text-white transition-colors">Careers</a>
              <Link to="/contact" className="block hover:text-white transition-colors">Contact</Link>
            </div>
          </div>

          <div>
            <p className="font-semibold text-white mb-5 text-sm tracking-wider">RESOURCES</p>
            <div className="space-y-3 text-sm">
              <a href="#" className="block hover:text-white transition-colors">Help Center</a>
              <a href="#" className="block hover:text-white transition-colors">Community</a>
              <a href="#" className="block hover:text-white transition-colors">Success Stories</a>
              <a href="#" className="block hover:text-white transition-colors">Safety & Trust</a>
            </div>
          </div>

          <div>
            <p className="font-semibold text-white mb-5 text-sm tracking-wider">LEGAL</p>
            <div className="space-y-3 text-sm">
              <a href="#" className="block hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="block hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="block hover:text-white transition-colors">Cookie Settings</a>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/60">
          <p>Made in Prishtina, Kosovo</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Facebook</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
            <a href="#" className="hover:text-white transition-colors">X (Twitter)</a>
          </div>
          <p>© {new Date().getFullYear()} Freelancer Marketplace</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;