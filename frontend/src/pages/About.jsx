import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FiArrowRight, FiAward, FiGlobe, FiLayers, FiShield, FiUsers, FiZap } from 'react-icons/fi';

const About = () => {
  const values = [
    {
      icon: <FiShield className="text-3xl" />,
      title: 'Trust First',
      description: 'We focus on secure payments, verified activity, and transparent collaboration for both sides.',
    },
    {
      icon: <FiZap className="text-3xl" />,
      title: 'Simple Flow',
      description: 'From posting a project to delivering results, every step is designed to stay fast and clear.',
    },
    {
      icon: <FiUsers className="text-3xl" />,
      title: 'Built For Both Sides',
      description: 'Clients find dependable talent while freelancers get a cleaner path to real opportunities.',
    },
  ];

  const milestones = [
    {
      number: '01',
      title: 'A clear problem to solve',
      description: 'Finding trustworthy talent and managing freelance work usually happens across too many disconnected tools.',
    },
    {
      number: '02',
      title: 'One place for the workflow',
      description: 'Freelancer Marketplace brings projects, proposals, communication, and payments into one platform.',
    },
    {
      number: '03',
      title: 'A stronger experience',
      description: 'The goal is to reduce friction, improve transparency, and make online collaboration easier to manage.',
    },
  ];

  const highlights = [
    { value: '142+', label: 'target markets supported', icon: <FiGlobe /> },
    { value: '24/7', label: 'platform availability vision', icon: <FiLayers /> },
    { value: '100%', label: 'focus on transparent flow', icon: <FiAward /> },
  ];

  const teamNotes = [
    'Freelancer Marketplace is being shaped as a serious digital product, not just a short-term prototype.',
    'The platform vision is to serve real clients and freelancers with a cleaner, more trustworthy workflow.',
    'Its foundation combines modern frontend development, backend services, and a scalable relational database.',
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="relative overflow-hidden bg-linear-to-br from-slate-950 via-indigo-950 to-teal-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.18),_transparent_30%)]" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
            <div className="max-w-3xl">
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold tracking-wide text-teal-100 backdrop-blur">
                ABOUT FREELANCER MARKETPLACE
              </span>
              <h1 className="mt-6 text-5xl md:text-7xl font-bold leading-tight">
                A smarter place for clients and freelancers to work together.
              </h1>
              <p className="mt-6 max-w-2xl text-lg md:text-xl text-slate-200 leading-8">
                Freelancer Marketplace is designed to simplify the full freelance journey, from posting opportunities and finding talent to managing communication, delivery, and trust.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-semibold text-slate-900 shadow-xl transition hover:scale-105"
                >
                  Join The Platform
                  <FiArrowRight className="transition group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/"
                  className="rounded-full border border-white/30 px-8 py-4 font-medium text-white transition hover:bg-white/10"
                >
                  Back To Home
                </Link>
              </div>
            </div>

            <div className="grid gap-5">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
                <p className="text-sm uppercase tracking-[0.25em] text-teal-200">Mission</p>
                <p className="mt-4 text-2xl font-semibold leading-9">
                  Connect reliable clients and skilled freelancers through one transparent digital workspace.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {highlights.map((item) => (
                  <div key={item.label} className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
                    <div className="text-teal-300">{item.icon}</div>
                    <p className="mt-4 text-3xl font-bold">{item.value}</p>
                    <p className="mt-2 text-sm text-slate-200">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-white py-8 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 'Clients', label: 'hire faster with clearer workflows' },
            { value: 'Freelancers', label: 'find projects that match real skills' },
            { value: 'Projects', label: 'managed with more visibility' },
            { value: 'Payments', label: 'planned around security and trust' },
          ].map((item) => (
            <div key={item.value} className="transition-transform hover:scale-105">
              <p className="text-2xl md:text-3xl font-bold text-slate-900">{item.value}</p>
              <p className="mt-2 text-sm text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-linear-to-b from-white to-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl">
            <span className="rounded-full bg-indigo-100 px-5 py-2 text-sm font-semibold text-indigo-700">
              WHY THIS PLATFORM EXISTS
            </span>
            <h2 className="mt-5 text-4xl md:text-5xl font-bold text-slate-900">
              Freelance work should feel organized, not fragmented.
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-8">
              Many freelance platforms feel crowded or transactional. This project aims to create a cleaner experience where clients can post work confidently and freelancers can respond with credibility, clarity, and less friction.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="inline-flex rounded-2xl bg-linear-to-br from-indigo-500 to-teal-500 p-4 text-white shadow-lg">
                  {value.icon}
                </div>
                <h3 className="mt-6 text-2xl font-bold text-slate-900">{value.title}</h3>
                <p className="mt-3 text-slate-600 leading-7">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-start">
            <div>
              <span className="rounded-full bg-teal-100 px-5 py-2 text-sm font-semibold text-teal-700">
                PLATFORM STORY
              </span>
              <h2 className="mt-5 text-4xl md:text-5xl font-bold text-slate-900">
                Built with a startup mindset from day one.
              </h2>
              <p className="mt-5 text-lg text-slate-600 leading-8">
                Freelancer Marketplace is being designed as a platform that can grow into a real product. The current direction already covers essential marketplace ideas such as user roles, project handling, proposals, reviews, contracts, messaging, and payment structure. The goal is to create something that feels credible, scalable, and ready for real-world use.
              </p>
            </div>

            <div className="space-y-6">
              {milestones.map((item) => (
                <div
                  key={item.number}
                  className="flex gap-5 rounded-3xl border border-slate-100 bg-slate-50 p-6 shadow-sm transition hover:shadow-lg"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-bold text-indigo-600 shadow-sm">
                    {item.number}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-slate-600 leading-7">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-[1fr_0.9fr] gap-10 items-start">
            <div className="rounded-[2rem] bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 p-10 text-white shadow-2xl">
              <span className="text-sm font-semibold tracking-[0.2em] text-teal-200">THE TEAM BEHIND THE PLATFORM</span>
              <h2 className="mt-5 text-4xl font-bold leading-tight">A focused team building toward a real marketplace product.</h2>
              <p className="mt-5 text-slate-200 leading-8">
                Freelancer Marketplace is being developed by a team that wants the platform to feel polished, useful, and product-ready. The intention is bigger than coursework. The intention is to build something people would actually want to use.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                {teamNotes.map((note) => (
                  <div
                    key={note}
                    className="rounded-3xl border border-slate-100 bg-white p-6 text-slate-700 shadow-sm"
                  >
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-linear-to-r from-indigo-600 via-purple-600 to-teal-500 py-24 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold">Ready to explore the platform vision?</h2>
          <p className="mt-5 text-xl text-indigo-100">
            Discover how Freelancer Marketplace is planned to make freelance collaboration more trusted, more modern, and easier to manage.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/"
              className="rounded-full bg-white px-8 py-4 font-semibold text-slate-900 shadow-xl transition hover:scale-105"
            >
              Return Home
            </Link>
            <Link
              to="/register"
              className="rounded-full border border-white/30 px-8 py-4 font-semibold text-white transition hover:bg-white/10"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
