import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FiArrowRight, FiCheck, FiShield, FiUsers, FiMessageSquare, FiCreditCard } from 'react-icons/fi';

const Features = () => {
  const coreFeatures = [
    {
      icon: <FiUsers className="text-4xl" />,
      title: "Smart Talent Discovery",
      description: "Find and connect with verified freelancers based on skills, experience, and ratings.",
    },
    {
      icon: <FiMessageSquare className="text-4xl" />,
      title: "Seamless Communication",
      description: "Built-in messaging keeps all project discussions organized and in one place.",
    },
    {
      icon: <FiCreditCard className="text-4xl" />,
      title: "Secure Milestone Payments",
      description: "Money is held safely until work is approved. Full transparency on every payment.",
    },
    {
      icon: <FiShield className="text-4xl" />,
      title: "Profile & Reputation System",
      description: "Detailed profiles, ratings, and reviews help both sides make confident decisions.",
    },
  ];

  const benefits = [
    {
      for: "For Clients",
      points: [
        "Post detailed projects with budget and timeline",
        "Compare proposals side by side",
        "Review freelancer profiles and past work",
        "Track progress and approve milestones easily"
      ]
    },
    {
      for: "For Freelancers",
      points: [
        "Discover relevant projects matching your expertise",
        "Submit professional proposals quickly",
        "Build reputation through ratings and reviews",
        "Receive secure and timely payments"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="bg-[#1a3c2e] text-white py-28">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <span className="inline-block px-6 py-2 bg-white/10 rounded-full text-sm font-medium tracking-widest mb-6">
            POWERFUL FEATURES
          </span>
          <h1 className="text-5xl md:text-6xl font-semibold leading-tight tracking-tight">
            Built for real freelance work
          </h1>
          <p className="mt-6 text-xl text-white/80 max-w-2xl mx-auto">
            A clean, modern platform that makes hiring, collaborating, and delivering projects simple and secure.
          </p>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-slate-900">Core Features</h2>
            <p className="text-slate-600 mt-3 text-lg">Everything you need in one professional workspace</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {coreFeatures.map((feature, i) => (
              <div 
                key={i}
                className="group bg-white border border-slate-100 hover:border-[#1a3c2e] p-10 rounded-3xl transition-all hover:shadow-xl"
              >
                <div className="text-[#1a3c2e] mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits for Clients & Freelancers */}
      <section className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-slate-900">Designed for both sides</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-10">
            {benefits.map((benefit, i) => (
              <div key={i} className="bg-white rounded-3xl p-10 border border-slate-100">
                <div className="inline-flex items-center gap-3 mb-8">
                  <div className="h-3 w-3 bg-[#1a3c2e] rounded-full"></div>
                  <h3 className="text-2xl font-semibold text-slate-900">{benefit.for}</h3>
                </div>
                
                <ul className="space-y-5">
                  {benefit.points.map((point, idx) => (
                    <li key={idx} className="flex gap-4">
                      <FiCheck className="text-[#1a3c2e] mt-1 flex-shrink-0" />
                      <span className="text-slate-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-slate-900">Simple end-to-end workflow</h2>
          </div>

          <div className="space-y-12">
            {[
              { num: "01", title: "Create Account", desc: "Sign up as Client or Freelancer in seconds" },
              { num: "02", title: "Post or Browse Projects", desc: "Clients post jobs • Freelancers discover opportunities" },
              { num: "03", title: "Connect & Collaborate", desc: "Proposals, messaging, and file sharing in one place" },
              { num: "04", title: "Deliver & Get Paid", desc: "Milestone payments and mutual reviews" }
            ].map((step, i) => (
              <div key={i} className="flex gap-10 items-start group">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-[#1a3c2e] text-white flex items-center justify-center text-2xl font-bold group-hover:scale-110 transition-transform">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-lg text-slate-600">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#1a3c2e] py-28 text-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-5xl font-semibold mb-6">Ready to experience a better way to work?</h2>
          <p className="text-xl text-white/80 mb-10">Join thousands of clients and freelancers already using Freelancer Marketplace.</p>
          
          <Link 
            to="/register"
            className="inline-block px-14 py-6 bg-white text-[#1a3c2e] font-semibold text-2xl rounded-3xl hover:bg-slate-100 transition-all"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Features;