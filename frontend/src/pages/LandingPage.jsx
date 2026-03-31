import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FiArrowRight, FiCheck, FiStar, FiUsers, FiBriefcase, FiDollarSign } from 'react-icons/fi';

const LandingPage = () => {
  const slides = [
    {
      title: "Hire Top Talent",
      subtitle: "Connect with expert freelancers ready for your next project",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
      color: "from-indigo-900/80 via-purple-900/80 to-teal-900/80"
    },
    {
      title: "Post Your Project",
      subtitle: "Get proposals from global talent within hours",
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
      color: "from-purple-900/80 via-teal-900/80 to-indigo-900/80"
    },
    {
      title: "Collaborate Seamlessly",
      subtitle: "Secure payments, milestones, and real-time communication",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
      color: "from-teal-900/80 via-indigo-900/80 to-purple-900/80"
    }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const roadmapSteps = [
    { num: "01", title: "Sign Up for Free", desc: "Create your account in 30 seconds and start immediately." },
    { num: "02", title: "Post Your Project", desc: "Describe your needs, budget, and deadline. It's 100% free." },
    { num: "03", title: "Receive Proposals", desc: "Qualified freelancers send you offers with their portfolios." },
    { num: "04", title: "Hire & Pay Securely", desc: "Choose the best match, pay through milestones, and get the job done." }
  ];

  const categories = [
    "Web Development", "Mobile Apps", "Graphic Design",
    "Writing & Translation", "Digital Marketing", "AI & Machine Learning"
  ];

  const featured = [
    { initials: "SC", name: "Sarah Chen", title: "Senior Full Stack Developer", rate: "$65/hr", rating: "4.9" },
    { initials: "MR", name: "Marcus Rodriguez", title: "UI/UX & Brand Designer", rate: "$48/hr", rating: "5.0" },
    { initials: "EP", name: "Elena Petrova", title: "Digital Marketing Expert", rate: "$55/hr", rating: "4.8" },
  ];

  const testimonials = [
    { quote: "Found a React developer in 4 hours who delivered perfectly in 3 days.", name: "Erti Hoxha", role: "Founder @ TechKosova" },
    { quote: "Landed 7 projects in my first month. Best decision I ever made.", name: "Filan Fisteku", role: "UI/UX Designer" },
    { quote: "Saved over 60% of my budget. World-class talent at my fingertips.", name: "Filane Fisteku", role: "CEO @ StartupAl" },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <section className="relative h-screen flex items-center overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${slide.color} mix-blend-multiply`}></div>
            <img src={slide.image} alt="Freelancer workspace" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40"></div>
          </div>
        ))}

        <div className="relative max-w-7xl mx-auto px-6 text-white z-10">
          <div className="max-w-2xl animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 drop-shadow-2xl">
              {slides[currentSlide].title}
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-gray-200 drop-shadow">
              {slides[currentSlide].subtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="px-8 py-4 bg-white text-gray-900 font-bold rounded-full hover:scale-105 transition-all shadow-xl flex items-center gap-2 group">
                Get Started Free <FiArrowRight className="group-hover:translate-x-1 transition" />
              </button>
              <button 
                onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 border-2 border-white/80 hover:bg-white/10 font-medium rounded-full transition-all"
              >
                How It Works
              </button>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">👨‍💻</div>
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">👩‍💼</div>
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">👨‍🎨</div>
                </div>
                <div>
                  <p className="font-semibold">+128,459 freelancers</p>
                  <p className="text-gray-200">online right now</p>
                </div>
              </div>
              <div className="h-10 w-px bg-white/40"></div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-lg">★★★★☆</span>
                <span className="font-semibold">4.98</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex gap-3 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${i === currentSlide ? 'bg-white scale-125 shadow-lg' : 'bg-white/60 hover:bg-white/80'}`}
            />
          ))}
        </div>
      </section>

      {/* Stats Bar */}
      <div className="bg-white py-8 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-6 gap-8 text-center">
          {[
            { value: "128K+", label: "Freelancers" },
            { value: "45K+", label: "Projects completed" },
            { value: "$18M+", label: "Earned" },
            { value: "4.98", label: "Avg rating" },
            { value: "142", label: "Countries" },
            { value: "100%", label: "Secure payments", highlight: true }
          ].map((stat, i) => (
            <div key={i} className="transition-transform hover:scale-105">
              <p className={`text-3xl font-bold ${stat.highlight ? 'text-teal-500' : 'text-gray-900'}`}>{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <section id="how-it-works" className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="px-6 py-2 bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-full">4 SIMPLE STEPS</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4">How Freelancer Marketplace Works</h2>
            <p className="text-xl text-gray-600 mt-3 max-w-md mx-auto">From idea to finished project — fast, safe, and stress-free.</p>
          </div>

          <div className="space-y-16 relative">
            {roadmapSteps.map((step, idx) => (
              <div key={idx} className="group relative flex flex-col md:flex-row gap-8 md:gap-12 items-start">
                {idx < roadmapSteps.length - 1 && (
                  <div className="absolute left-[31px] top-20 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 to-transparent hidden md:block"></div>
                )}
                <div className="flex-shrink-0 w-16 h-16 bg-white border-4 border-indigo-200 group-hover:border-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-bold text-indigo-500 group-hover:text-indigo-700 transition-all shadow-md">
                  {step.num}
                </div>
                <div className="flex-1 bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 group-hover:border-indigo-200">
                  <h3 className="text-2xl font-bold text-gray-900">{step.title}</h3>
                  <p className="text-gray-600 mt-2">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="categories" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Popular Categories</h2>
            <a href="#" className="text-indigo-600 font-medium hover:underline flex items-center gap-1">Browse all →</a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((cat, i) => (
              <div key={i} className="group bg-gray-50 hover:bg-indigo-50 rounded-2xl p-6 text-center transition-all cursor-pointer hover:-translate-y-1 shadow-sm hover:shadow-md">
                <h3 className="font-semibold text-lg text-gray-800 group-hover:text-indigo-700">{cat}</h3>
                <p className="text-teal-600 mt-2 text-sm">1.2K+ projects</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">Featured Freelancers This Week</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {featured.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all hover:-translate-y-2 text-center">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-6">
                  {f.initials}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{f.name}</h3>
                <p className="text-gray-600 mt-1">{f.title}</p>
                <div className="flex justify-center items-center gap-4 mt-6">
                  <div className="flex items-center gap-1 text-amber-400">
                    <FiStar className="fill-current" /> <span className="text-gray-700">{f.rating}</span>
                  </div>
                  <p className="font-bold text-teal-600 text-xl">{f.rate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">What Our Clients Say</h2>
          <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">Real stories from real people who found success on our platform</p>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-gray-50 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center gap-2 text-amber-400 mb-4">
                  <FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar className="fill-current" /><FiStar />
                </div>
                <p className="italic text-gray-700">“{t.quote}”</p>
                <div className="mt-6">
                  <p className="font-bold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-500 py-24 text-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to hire or get hired?</h2>
          <p className="text-xl text-indigo-100 mb-10">Join thousands of businesses and freelancers already growing with us.</p>
          <button className="px-10 py-5 bg-white text-gray-900 font-bold text-xl rounded-full hover:scale-105 transition-all shadow-2xl flex items-center gap-2 mx-auto group">
            Create Free Account <FiArrowRight className="group-hover:translate-x-1 transition" />
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LandingPage;