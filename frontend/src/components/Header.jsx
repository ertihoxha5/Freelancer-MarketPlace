import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <span className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-blue-600 via-purple-600 to-teal-500 bg-clip-text text-transparent">
            Freelancer
          </span>
          <span className="text-3xl font-semibold tracking-tight text-gray-900">MARKETPLACE</span>
        </div>

        <div className="hidden md:flex items-center gap-x-8 text-gray-700 font-medium">
          <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
          <a href="#" className="hover:text-blue-600 transition-colors">Features</a>
          <Link to="/about" className="hover:text-blue-600 transition-colors">About</Link>
          <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
        </div>

        <div className="flex items-center gap-x-4">
          <Link to="/login" className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-3xl font-medium transition-colors">
            Login
          </Link>
          <Link to="/register" className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-semibold rounded-3xl transition-all shadow-md">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Header;
