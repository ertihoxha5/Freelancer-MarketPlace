import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FiArrowRight, FiStar } from 'react-icons/fi';

const LandingPage = () => {
  const slides = [
    {
      title: "Hire Exceptional Talent",
      subtitle: "Connect with top verified freelancers and bring your ideas to life",
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
    },
    {
      title: "Launch Projects Faster",
      subtitle: "Post once and receive high-quality proposals from skilled professionals",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
    },
    {
      title: "Work with Confidence",
      subtitle: "Secure payments, clear milestones, and transparent collaboration",
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
    }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />

      {/* ==================== HERO ==================== */}
      <section className="relative h-screen flex items-center overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <img
              src={slide.image}
              alt="hero"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80"></div>
          </div>
        ))}

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="max-w-2xl">
            <h1 className="text-6xl md:text-7xl font-semibold leading-none tracking-tighter mb-8 text-slate-900">
              {slides[currentSlide].title}
            </h1>
            <p className="text-2xl text-slate-600 mb-12 leading-relaxed">
              {slides[currentSlide].subtitle}
            </p>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
                className="px-10 py-4 bg-[#1a3c2e] hover:bg-[#2a5c46] text-white rounded-2xl font-semibold text-lg transition-all flex items-center gap-3"
              >
                How It Works <FiArrowRight />
              </button>
              <button className="px-10 py-4 border-2 border-[#1a3c2e] text-[#1a3c2e] hover:bg-[#1a3c2e] hover:text-white rounded-2xl font-semibold text-lg transition-all">
                Browse Talent
              </button>
            </div>

            <div className="mt-16 flex items-center gap-12 text-sm">
              <div>
                <p className="font-semibold text-3xl text-slate-900">4.98</p>
                <p className="text-slate-500">Average rating</p>
              </div>
              <div>
                <p className="font-semibold text-3xl text-slate-900">128K+</p>
                <p className="text-slate-500">Freelancers online</p>
              </div>
              <div>
                <p className="font-semibold text-3xl text-slate-900">$18M+</p>
                <p className="text-slate-500">Paid securely</p>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel dots */}
        <div className="absolute bottom-12 left-1/2 flex gap-3 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-3 h-3 rounded-full transition-all ${i === currentSlide ? 'bg-[#1a3c2e]' : 'bg-slate-300 hover:bg-slate-400'}`}
            />
          ))}
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section id="how-it-works" className="py-28 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="px-6 py-2 bg-[#1a3c2e] text-white text-sm font-medium rounded-3xl">4 SIMPLE STEPS</span>
            <h2 className="text-5xl font-semibold text-slate-900 mt-6">How it works</h2>
            <p className="text-xl text-slate-600 mt-3">From idea to successful delivery in four clear steps</p>
          </div>

          <div className="grid md:grid-cols-4 gap-10">
            {[
              { num: "01", title: "Sign Up Free", desc: "Create your account in seconds and explore the platform." },
              { num: "02", title: "Post Your Project", desc: "Describe what you need, set your budget and timeline." },
              { num: "03", title: "Receive Proposals", desc: "Get offers from qualified and reviewed freelancers." },
              { num: "04", title: "Hire & Collaborate", desc: "Choose the best match and work securely with milestones." }
            ].map((step, i) => (
              <div key={i} className="group">
                <div className="text-7xl font-bold text-slate-100 group-hover:text-[#1a3c2e] transition-colors mb-6">
                  {step.num}
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-4">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CATEGORIES ==================== */}
      <section className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-semibold text-slate-900">Popular Categories</h2>
            <p className="text-slate-600 mt-2">Specialists ready for every type of project</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              "Web Development", "Mobile Apps", "UI/UX Design",
              "Digital Marketing", "Content & Writing", "AI & Automation"
            ].map((cat, i) => (
              <div 
                key={i}
                className="bg-white border border-slate-100 hover:border-[#1a3c2e] hover:shadow-xl p-8 rounded-3xl transition-all group text-center"
              >
                <h3 className="font-semibold text-xl text-slate-900 group-hover:text-[#1a3c2e] transition-colors">
                  {cat}
                </h3>
                <p className="text-[#4a7043] text-sm mt-6">1,200+ active projects</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURED FREELANCERS ==================== */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-semibold text-slate-900">Featured Professionals</h2>
            <p className="text-slate-600 mt-2">Highly rated experts available now</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { initials: "SC", name: "Sarah Chen", title: "Senior Full Stack Developer", rate: "$65/hr", rating: "4.9" },
              { initials: "MR", name: "Marcus Rodriguez", title: "UI/UX & Brand Designer", rate: "$48/hr", rating: "5.0" },
              { initials: "EP", name: "Elena Petrova", title: "Digital Marketing Strategist", rate: "$55/hr", rating: "4.8" }
            ].map((f, i) => (
              <div key={i} className="bg-white border border-slate-100 hover:border-[#1a3c2e] rounded-3xl p-8 text-center transition-all hover:shadow-2xl">
                <div className="w-20 h-20 mx-auto bg-[#1a3c2e] text-white rounded-3xl flex items-center justify-center text-4xl font-bold mb-6">
                  {f.initials}
                </div>
                <h4 className="text-2xl font-semibold">{f.name}</h4>
                <p className="text-slate-600 mt-1">{f.title}</p>
                <div className="mt-8 flex justify-center items-center gap-4">
                  <div className="flex text-amber-400">★★★★☆</div>
                  <span className="font-bold text-xl text-[#1a3c2e]">{f.rate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-slate-900">What Our Clients Say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { quote: "Found a React developer in 4 hours who delivered perfectly in 3 days.", name: "Erti Hoxha", role: "Founder @ TechKosova" },
              { quote: "Landed 7 projects in my first month. Best decision I ever made.", name: "Filan Fisteku", role: "UI/UX Designer" },
              { quote: "Saved over 60% of my budget with world-class talent.", name: "Filane Fisteku", role: "CEO @ StartupAl" }
            ].map((t, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 hover:shadow-xl transition-all">
                <div className="text-amber-400 text-2xl mb-6">★★★★☆</div>
                <p className="italic text-lg leading-relaxed text-slate-700">“{t.quote}”</p>
                <div className="mt-10">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-slate-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <div className="bg-[#1a3c2e] py-28 text-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-5xl font-semibold mb-6">Ready to build something great?</h2>
          <p className="text-xl text-white/80 mb-12">Join thousands of clients and freelancers already succeeding together.</p>
          <button className="px-14 py-6 bg-white text-[#1a3c2e] rounded-3xl font-semibold text-2xl hover:bg-slate-100 transition-all shadow-xl">
            Get Started Free
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LandingPage;