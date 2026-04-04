import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FiMail, FiPhone, FiMapPin, FiSend } from "react-icons/fi";

const Contact = ()=>{
  return (
    <div className="min-h-screen bg-white">
      <Header/>
      <section className="bg-linear-to-br from-slate-950 via-indigo-950 to-teal-950 text-white py-6">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="mt-6 text-5xl md:text-5xl font-bold">We are here to help you</h1>
          <p className="mt-3 text-lg text-slate-200 max-w-2xl mx-auto">
            Have questions about the platform, projects, or collaboration?
            Reach out with your questions and our team will respond promptly.</p>
        </div>
      </section>
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16">
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-slate-900">Contact Information</h2>
            <p className="text-slate-600 leading-7">Freelancer Marketplace is built to simplify communication between clients and freelancers. If you need help, feedback, or support, feel free to reach out.</p>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-indigo-100 text-indigo-600">
                <FiMail/>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Email</p>
                  <p className="text-slate-600">support@freelancer.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-indigo-100 text-indigo-600">
                  <FiPhone/>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Phone</p>
                  <p className="text-slate-600">+383 44 385 277</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-indigo-100 text-indigo-600">
                  <FiMapPin />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Location</p>
                  <p className="text-slate-600">Prishtinë, Kosovo 10000</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900">Send a Message</h2>
            <form className="mt-6 space-y-5">
              <input type="email" placeholder="Your Email" className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              <textarea rows="3" placeholder="Your Message" className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              <button type="submitt" className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-xl font-semibold hover:bg-indigo-700 transition">Send<FiSend px-2/></button>
            </form>
          </div>
        </div>
      </section>
      <section className="bg-linear-to-r from-indigo-600 via-purple-600 to-teal-500 py-20 text-white text-center">
        <h2 className="text-4xl font-bold">We are here to help you succeed.</h2>
        <p className="mt-4 text-lg text-indigo-100">Whether you are a client or a freelancer, we are here to assist you every step of the way.</p>
      </section>
      <Footer/>
    </div>
  );
};


export default Contact;