import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FiMail, FiPhone, FiMapPin, FiSend, FiClock } from 'react-icons/fi';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Këtu mund të shtosh logjikën e dërgimit të email-it më vonë
    setSubmitted(true);
    
    // Reset form after submit
    setTimeout(() => {
      setFormData({ name: '', email: '', subject: '', message: '' });
      setSubmitted(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="bg-[#1a3c2e] text-white py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-block px-6 py-2 bg-white/10 rounded-full text-sm font-medium tracking-widest mb-6">
            GET IN TOUCH
          </span>
          <h1 className="text-5xl md:text-6xl font-semibold leading-tight tracking-tighter">
            We're here to help
          </h1>
          <p className="mt-6 text-xl text-white/80 max-w-2xl mx-auto">
            Have questions about the platform, projects, or how we can support you? 
            Our team is ready to assist you.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-5 gap-16">
          
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h2 className="text-3xl font-semibold text-slate-900 mb-8">Contact Information</h2>
              <div className="space-y-8">
                <div className="flex gap-5">
                  <div className="w-12 h-12 bg-[#1a3c2e] text-white rounded-2xl flex items-center justify-center flex-shrink-0">
                    <FiMail size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Email</p>
                    <a href="mailto:support@freelancermarketplace.com" className="text-slate-600 hover:text-[#1a3c2e] transition">
                      support@freelancermarketplace.com
                    </a>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="w-12 h-12 bg-[#1a3c2e] text-white rounded-2xl flex items-center justify-center flex-shrink-0">
                    <FiPhone size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Phone</p>
                    <a href="tel:+38344385277" className="text-slate-600 hover:text-[#1a3c2e] transition">
                      +383 44 385 277
                    </a>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="w-12 h-12 bg-[#1a3c2e] text-white rounded-2xl flex items-center justify-center flex-shrink-0">
                    <FiMapPin size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Office</p>
                    <p className="text-slate-600">Prishtina, Kosovo 10000</p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="w-12 h-12 bg-[#1a3c2e] text-white rounded-2xl flex items-center justify-center flex-shrink-0">
                    <FiClock size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Response Time</p>
                    <p className="text-slate-600">Usually within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white border border-slate-100 shadow-xl rounded-3xl p-10 md:p-12">
              <h2 className="text-3xl font-semibold text-slate-900 mb-8">Send us a message</h2>

              {submitted ? (
                <div className="bg-green-50 border border-green-200 text-green-700 p-8 rounded-2xl text-center">
                  <p className="text-2xl font-medium">Thank you!</p>
                  <p className="mt-3">Your message has been received. We'll get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Your Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-[#1a3c2e] focus:ring-1 focus:ring-[#1a3c2e] outline-none transition"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-[#1a3c2e] focus:ring-1 focus:ring-[#1a3c2e] outline-none transition"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Subject</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-[#1a3c2e] focus:ring-1 focus:ring-[#1a3c2e] outline-none transition"
                      placeholder="How can we help you?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Your Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows="6"
                      className="w-full px-5 py-4 rounded-3xl border border-slate-200 focus:border-[#1a3c2e] focus:ring-1 focus:ring-[#1a3c2e] outline-none transition resize-y"
                      placeholder="Write your message here..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#1a3c2e] hover:bg-[#2a5c46] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all text-lg"
                  >
                    Send Message <FiSend />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="bg-zinc-50 py-20 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-semibold text-slate-900">We respond quickly</h2>
          <p className="mt-4 text-slate-600">
            Our support team usually replies within 24 hours during business days.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;