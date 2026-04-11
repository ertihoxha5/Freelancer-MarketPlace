import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FiArrowRight, FiShield, FiZap, FiUsers } from 'react-icons/fi';

const About = () => {
  const values = [
    {
      icon: <FiShield className="text-4xl" />,
      title: "Trust First",
      description: "Secure payments, verified profiles, and transparent processes are at the core of everything we build.",
    },
    {
      icon: <FiZap className="text-4xl" />,
      title: "Simplicity",
      description: "We remove unnecessary complexity so clients and freelancers can focus on what matters — the work.",
    },
    {
      icon: <FiUsers className="text-4xl" />,
      title: "Built for Both Sides",
      description: "A balanced platform where clients find quality talent and freelancers find meaningful opportunities.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="bg-[#1a3c2e] text-white py-28">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <span className="inline-block px-6 py-2 bg-white/10 rounded-full text-sm font-medium tracking-widest mb-6">
            ABOUT US
          </span>
          <h1 className="text-5xl md:text-6xl font-semibold leading-tight tracking-tighter">
            A better way for clients and freelancers to work together
          </h1>
          <p className="mt-8 text-xl text-white/80 max-w-3xl mx-auto">
            Freelancer Marketplace was created to solve real problems in the freelance world — fragmented tools, lack of trust, and complicated workflows.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-semibold text-slate-900">Our Mission</h2>
          <p className="mt-6 text-2xl text-slate-600 leading-relaxed">
            To build a clean, trustworthy, and efficient platform where clients can hire with confidence and freelancers can grow their careers with clarity and fairness.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-slate-900">Our Values</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, i) => (
              <div 
                key={i}
                className="bg-white border border-slate-100 hover:border-[#1a3c2e] p-10 rounded-3xl transition-all hover:shadow-xl"
              >
                <div className="text-[#1a3c2e] mb-8">
                  {value.icon}
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-4">{value.title}</h3>
                <p className="text-slate-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why We Exist */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="px-6 py-2 bg-[#1a3c2e] text-white text-sm font-medium rounded-3xl">THE PROBLEM</span>
              <h2 className="mt-6 text-4xl font-semibold text-slate-900 leading-tight">
                Freelance work shouldn't feel chaotic
              </h2>
              <p className="mt-8 text-lg text-slate-600 leading-relaxed">
                Too many tools, scattered conversations, unclear payments, and lack of trust make the freelance experience frustrating for both clients and freelancers.
              </p>
            </div>

            <div className="space-y-8">
              {[
                {
                  title: "Fragmented Tools",
                  desc: "Clients and freelancers jump between email, WhatsApp, Trello, PayPal, and multiple platforms."
                },
                {
                  title: "Lack of Transparency",
                  desc: "Unclear project status, delayed payments, and difficulty evaluating talent."
                },
                {
                  title: "Low Trust",
                  desc: "Hard to verify skills and build long-term professional relationships."
                }
              ].map((item, i) => (
                <div key={i} className="flex gap-6">
                  <div className="shrink-0 w-8 h-8 rounded-2xl bg-[#1a3c2e] text-white flex items-center justify-center font-bold text-lg">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-xl">{item.title}</h3>
                    <p className="mt-2 text-slate-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our Goal */}
      <section className="py-24 bg-zinc-50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-semibold text-slate-900 mb-6">Our Goal</h2>
          <p className="text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            To create one clean, professional platform where clients can hire with confidence and freelancers can build sustainable careers — all in a single, trustworthy workspace.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#1a3c2e] py-28 text-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-5xl font-semibold mb-6">Ready to be part of something better?</h2>
          <p className="text-xl text-white/80 mb-12">Join our growing community of clients and freelancers building the future of work.</p>
          
          <Link 
            to="/register"
            className="inline-block px-14 py-6 bg-white text-[#1a3c2e] font-semibold text-2xl rounded-3xl hover:bg-slate-100 transition-all"
          >
            Join Now — It's Free
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;