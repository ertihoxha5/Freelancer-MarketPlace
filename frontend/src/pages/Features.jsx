import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  FiArrowRight,
  FiBriefcase,
  FiCheckCircle,
  FiCreditCard,
  FiFileText,
  FiMessageSquare,
  FiShield,
  FiStar,
  FiUserCheck,
} from 'react-icons/fi';

const Features = () => {
  const coreFeatures = [
    {
      icon: <FiBriefcase className="text-3xl" />,
      title: 'Project Posting',
      description: 'Clients can publish projects with clear budgets, timelines, and requirements in one structured flow.',
    },
    {
      icon: <FiFileText className="text-3xl" />,
      title: 'Smart Proposals',
      description: 'Freelancers can respond with targeted offers, cover letters, and a more professional pitch.',
    },
    {
      icon: <FiUserCheck className="text-3xl" />,
      title: 'Profile-Driven Hiring',
      description: 'Detailed freelancer profiles help clients evaluate skills, experience, and trust signals faster.',
    },
    {
      icon: <FiMessageSquare className="text-3xl" />,
      title: 'Direct Communication',
      description: 'Built-in messaging keeps project discussions, updates, and clarifications in one place.',
    },
    {
      icon: <FiCreditCard className="text-3xl" />,
      title: 'Secure Payments',
      description: 'Payment flow is designed around reliability, transparency, and milestone-based collaboration.',
    },
    {
      icon: <FiStar className="text-3xl" />,
      title: 'Reviews And Ratings',
      description: 'Feedback helps both clients and freelancers build reputation and make better decisions.',
    },
  ];

  const audienceBenefits = [
    {
      title: 'For Clients',
      accent: 'from-indigo-600 to-blue-500',
      points: [
        'Post projects with requirements, budget, and deadlines.',
        'Compare proposals from different freelancers in one place.',
        'Review profiles before making hiring decisions.',
        'Manage communication and work progress more clearly.',
      ],
    },
    {
      title: 'For Freelancers',
      accent: 'from-teal-500 to-cyan-500',
      points: [
        'Discover projects that match your skills and experience.',
        'Submit proposals with stronger visibility and structure.',
        'Build trust through ratings, reviews, and completed work.',
        'Work through a platform designed for long-term credibility.',
      ],
    },
  ];

  const workflow = [
    {
      number: '01',
      title: 'Create your account',
      description: 'Sign up as a client or freelancer and enter the platform with the role that fits your goals.',
    },
    {
      number: '02',
      title: 'Post or discover opportunities',
      description: 'Clients publish projects while freelancers browse open work and identify strong matches.',
    },
    {
      number: '03',
      title: 'Connect and collaborate',
      description: 'Proposals, profiles, and messaging help both sides move from interest to agreement quickly.',
    },
    {
      number: '04',
      title: 'Deliver and build trust',
      description: 'Milestones, payments, and reviews turn a single project into a lasting working relationship.',
    },
  ];

  const trustItems = [
    {
      title: 'Transparent workflow',
      description: 'Important steps are visible and organized instead of being scattered across multiple tools.',
    },
    {
      title: 'Better decision-making',
      description: 'Profiles, proposals, and reviews help users choose with more confidence.',
    },
    {
      title: 'Scalable foundation',
      description: 'The platform is designed to grow into a richer marketplace product over time.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="relative overflow-hidden bg-linear-to-br from-slate-950 via-indigo-950 to-teal-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.18),transparent_30%)]" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold tracking-wide text-teal-100 backdrop-blur">
                PLATFORM FEATURES
              </span>
              <h1 className="mt-6 text-5xl md:text-7xl font-bold leading-tight">
                Everything needed to hire, collaborate, and deliver with confidence.
              </h1>
              <p className="mt-6 max-w-2xl text-lg md:text-xl text-slate-200 leading-8">
                Freelancer Marketplace combines project discovery, hiring, communication, payments, and reputation into one cleaner product experience for both clients and freelancers.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-semibold text-slate-900 shadow-xl transition hover:scale-105"
                >
                  Get Started
                  <FiArrowRight />
                </Link>
                <Link
                  to="/about"
                  className="rounded-full border border-white/30 px-8 py-4 font-medium text-white transition hover:bg-white/10"
                >
                  Learn More About Us
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { value: '6+', label: 'core platform modules' },
                { value: '2', label: 'main user roles supported' },
                { value: '1', label: 'connected workflow' },
                { value: '24/7', label: 'product-ready mindset' },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/10 p-7 backdrop-blur shadow-xl">
                  <p className="text-4xl font-bold">{item.value}</p>
                  <p className="mt-2 text-slate-200">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-white py-8 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 'Projects', label: 'posted with structure and clarity' },
            { value: 'Proposals', label: 'managed in a single flow' },
            { value: 'Messages', label: 'kept close to the work' },
            { value: 'Payments', label: 'built around trust and progress' },
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
              CORE CAPABILITIES
            </span>
            <h2 className="mt-5 text-4xl md:text-5xl font-bold text-slate-900">
              Features designed around the real freelance workflow.
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-8">
              The platform is structured to support the full journey from discovering opportunities to completing work and building long-term trust.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {coreFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="inline-flex rounded-2xl bg-linear-to-br from-indigo-500 to-teal-500 p-4 text-white shadow-lg">
                  {feature.icon}
                </div>
                <h3 className="mt-6 text-2xl font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-slate-600 leading-7">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <span className="rounded-full bg-teal-100 px-5 py-2 text-sm font-semibold text-teal-700">
              BUILT FOR BOTH SIDES
            </span>
            <h2 className="mt-5 text-4xl md:text-5xl font-bold text-slate-900">
              A platform that works for clients and freelancers at the same time.
            </h2>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {audienceBenefits.map((group) => (
              <div
                key={group.title}
                className="rounded-4xl border border-slate-100 bg-slate-50 p-8 shadow-sm"
              >
                <div className={`inline-flex rounded-2xl bg-linear-to-r ${group.accent} px-5 py-3 text-lg font-semibold text-white shadow-lg`}>
                  {group.title}
                </div>
                <div className="mt-8 space-y-5">
                  {group.points.map((point) => (
                    <div key={point} className="flex items-start gap-4">
                      <div className="mt-1 rounded-full bg-emerald-100 p-2 text-emerald-600">
                        <FiCheckCircle />
                      </div>
                      <p className="text-slate-700 leading-7">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-start">
            <div>
              <span className="rounded-full bg-indigo-100 px-5 py-2 text-sm font-semibold text-indigo-700">
                HOW IT FLOWS
              </span>
              <h2 className="mt-5 text-4xl md:text-5xl font-bold text-slate-900">
                A feature set that follows the full project lifecycle.
              </h2>
              <p className="mt-5 text-lg text-slate-600 leading-8">
                Instead of solving only one part of the freelance process, the platform aims to connect each step into a smoother end-to-end experience.
              </p>
            </div>

            <div className="space-y-6">
              {workflow.map((item) => (
                <div
                  key={item.number}
                  className="flex gap-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-lg"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xl font-bold text-white shadow-sm">
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

      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-[2.25rem] bg-linear-to-br from-slate-950 via-indigo-950 to-teal-950 p-10 md:p-14 text-white shadow-2xl">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <span className="text-sm font-semibold tracking-[0.2em] text-teal-200">WHY THESE FEATURES MATTER</span>
                <h2 className="mt-5 text-4xl font-bold leading-tight">
                  Strong features create trust, and trust creates better work.
                </h2>
                <p className="mt-5 text-slate-200 leading-8">
                  Freelancer Marketplace is being shaped around clarity, security, and a workflow users can actually rely on. The product direction is to make freelance collaboration feel less chaotic and more professional.
                </p>
              </div>

              <div className="grid gap-4">
                {trustItems.map((item) => (
                  <div key={item.title} className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-white/10 p-3 text-teal-200">
                        <FiShield />
                      </div>
                      <h3 className="text-xl font-bold">{item.title}</h3>
                    </div>
                    <p className="mt-4 text-slate-200 leading-7">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-linear-to-r from-indigo-600 via-purple-600 to-teal-500 py-24 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold">Ready to use a platform built around better freelance work?</h2>
          <p className="mt-5 text-xl text-indigo-100">
            Explore the product vision, create an account, and see how the experience is meant to connect hiring, delivery, and trust.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="rounded-full bg-white px-8 py-4 font-semibold text-slate-900 shadow-xl transition hover:scale-105"
            >
              Create Account
            </Link>
            <Link
              to="/about"
              className="rounded-full border border-white/30 px-8 py-4 font-semibold text-white transition hover:bg-white/10"
            >
              About The Product
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Features;
