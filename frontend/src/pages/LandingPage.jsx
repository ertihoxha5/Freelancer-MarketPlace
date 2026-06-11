import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { FiArrowRight, FiStar } from "react-icons/fi";
import { fetchPublicHomeData } from "../apiServices.js";

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [homeData, setHomeData] = useState({
    categories: [],
    topFreelancers: [],
    testimonials: [],
  });

  const slides = [
    {
      title: "Hire Exceptional Talent",
      subtitle: "Connect with top verified freelancers and bring your ideas to life",
      image:
        "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
    },
    {
      title: "Launch Projects Faster",
      subtitle: "Post once and receive high-quality proposals from skilled professionals",
      image:
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
    },
    {
      title: "Work with Confidence",
      subtitle: "Secure payments, clear milestones, and transparent collaboration",
      image:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchPublicHomeData()
      .then((data) =>
        setHomeData({
          categories: Array.isArray(data.categories) ? data.categories : [],
          topFreelancers: Array.isArray(data.topFreelancers)
            ? data.topFreelancers
            : [],
          testimonials: Array.isArray(data.testimonials) ? data.testimonials : [],
        }),
      )
      .catch(() => {
        setHomeData((current) => current);
      });
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />

      <section className="relative flex h-screen items-center overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? "opacity-100" : "opacity-0"}`}
          >
            <img src={slide.image} alt="hero" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-r from-white via-white/95 to-transparent" />
            <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-white/80" />
          </div>
        ))}

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <h1 className="mb-8 text-6xl font-semibold leading-none tracking-tighter text-slate-900 md:text-7xl">
              {slides[currentSlide].title}
            </h1>
            <p className="mb-12 text-2xl leading-relaxed text-slate-600">
              {slides[currentSlide].subtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-3 rounded-2xl bg-[#1a3c2e] px-10 py-4 text-lg font-semibold text-white transition-all hover:bg-[#2a5c46]"
              >
                How It Works <FiArrowRight />
              </button>
              <button
                onClick={() => document.getElementById("featured-freelancers")?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-2xl border-2 border-[#1a3c2e] px-10 py-4 text-lg font-semibold text-[#1a3c2e] transition-all hover:bg-[#1a3c2e] hover:text-white"
              >
                Browse Talent
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 z-20 flex gap-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-3 w-3 rounded-full transition-all ${i === currentSlide ? "bg-[#1a3c2e]" : "bg-slate-300 hover:bg-slate-400"}`}
            />
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <span className="rounded-3xl bg-[#1a3c2e] px-6 py-2 text-sm font-medium text-white">4 SIMPLE STEPS</span>
            <h2 className="mt-6 text-5xl font-semibold text-slate-900">How it works</h2>
            <p className="mt-3 text-xl text-slate-600">From idea to successful delivery in four clear steps</p>
          </div>

          <div className="grid gap-10 md:grid-cols-4">
            {[
              { num: "01", title: "Sign Up Free", desc: "Create your account in seconds and explore the platform." },
              { num: "02", title: "Post Your Project", desc: "Describe what you need, set your budget and timeline." },
              { num: "03", title: "Receive Proposals", desc: "Get offers from qualified and reviewed freelancers." },
              { num: "04", title: "Hire & Collaborate", desc: "Choose the best match and work securely with milestones." },
            ].map((step) => (
              <div key={step.num}>
                <div className="mb-6 text-7xl font-bold text-slate-100 transition-colors hover:text-[#1a3c2e]">
                  {step.num}
                </div>
                <h3 className="mb-4 text-2xl font-semibold text-slate-900">{step.title}</h3>
                <p className="leading-relaxed text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-semibold text-slate-900">Popular Categories</h2>
            <p className="mt-2 text-slate-600">Specialists ready for every type of project</p>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
            {(homeData.categories.length > 0
              ? homeData.categories
              : [
                  { cName: "Web Development" },
                  { cName: "Mobile Apps" },
                  { cName: "UI/UX Design" },
                  { cName: "Digital Marketing" },
                  { cName: "Content & Writing" },
                  { cName: "AI & Automation" },
                ]
            ).map((category, index) => (
              <div
                key={category.id ?? index}
                className="group rounded-3xl border border-slate-100 bg-white p-8 text-center transition-all hover:border-[#1a3c2e] hover:shadow-xl"
              >
                <h3 className="text-xl font-semibold text-slate-900 transition-colors group-hover:text-[#1a3c2e]">
                  {category.cName}
                </h3>
                <p className="mt-6 text-sm text-[#4a7043]">{category.skillCount || "Popular"} skills</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="featured-freelancers" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-semibold text-slate-900">Featured Professionals</h2>
            <p className="mt-2 text-slate-600">Highest rated freelancers on the platform</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {(homeData.topFreelancers.length > 0
              ? homeData.topFreelancers
              : [
                  { fullName: "Sarah Chen", hourlyRate: 65, avgRating: 4.9, reviewCount: 24, bio: "Senior Full Stack Developer" },
                  { fullName: "Marcus Rodriguez", hourlyRate: 48, avgRating: 5.0, reviewCount: 18, bio: "UI/UX & Brand Designer" },
                  { fullName: "Elena Petrova", hourlyRate: 55, avgRating: 4.8, reviewCount: 16, bio: "Digital Marketing Strategist" },
                ]
            ).map((freelancer) => (
              <div key={freelancer.id ?? freelancer.fullName} className="rounded-3xl border border-slate-100 bg-white p-8 text-center transition-all hover:border-[#1a3c2e] hover:shadow-2xl">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#1a3c2e] text-4xl font-bold text-white">
                  {String(freelancer.fullName || "F").slice(0, 2).toUpperCase()}
                </div>
                <h4 className="text-2xl font-semibold">{freelancer.fullName}</h4>
                <p className="mt-1 text-slate-600">{freelancer.bio || "Top rated freelancer"}</p>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    <FiStar />
                    <span className="font-semibold text-slate-900">{freelancer.avgRating ?? "-"}</span>
                  </div>
                  <span className="font-bold text-xl text-[#1a3c2e]">
                    ${Number(freelancer.hourlyRate || 0) ? `${freelancer.hourlyRate}/hr` : "Flexible"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-semibold text-slate-900">What Our Clients Say</h2>
            <p className="mt-2 text-slate-600">Testimonials from the platform community</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {(homeData.testimonials.length > 0
              ? homeData.testimonials
              : [
                  { fullName: "Erti Hoxha", roleTitle: "Founder @ TechKosova", rating: 5, comment: "Found a React developer in 4 hours who delivered perfectly in 3 days." },
                  { fullName: "Filan Fisteku", roleTitle: "UI/UX Designer", rating: 5, comment: "Landed 7 projects in my first month. Best decision I ever made." },
                  { fullName: "Filane Fisteku", roleTitle: "CEO @ StartupAl", rating: 5, comment: "Saved over 60% of my budget with world-class talent." },
                ]
            ).map((testimonial) => (
              <div key={testimonial.id ?? testimonial.fullName} className="rounded-3xl border border-slate-100 bg-white p-8 transition-all hover:shadow-xl">
                <div className="mb-6 text-2xl text-amber-400">
                  {"★".repeat(Number(testimonial.rating || 5))}
                </div>
                <p className="text-lg leading-relaxed italic text-slate-700">"{testimonial.comment}"</p>
                <div className="mt-10">
                  <p className="font-semibold">{testimonial.fullName}</p>
                  <p className="text-sm text-slate-500">{testimonial.roleTitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-[#1a3c2e] py-28 text-center text-white">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-6 text-5xl font-semibold">Ready to build something great?</h2>
          <p className="mb-12 text-xl text-white/80">
            Join thousands of clients and freelancers already succeeding together.
          </p>
          <button className="rounded-3xl bg-white px-14 py-6 text-2xl font-semibold text-[#1a3c2e] transition-all hover:bg-slate-100">
            Get Started Free
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
