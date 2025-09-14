"use client";
import React from "react";
import { motion } from "framer-motion";
import Header from "../components/landing/Header";
import Hero from "../components/landing/Hero";
import Features from "../components/landing/Features";
import CTA from "../components/landing/CTA";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Header />
      <main>
        <Hero />
        <Features />
        <CTA />
      </main>

      {/* Footer minimalista */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeWidth="2" d="M12 6v6l4 2" />
                </svg>
              </div>
              <span className="text-slate-400 font-medium">TokiTask</span>
            </div>
            <p className="text-slate-500 text-sm">
              © 2024 TokiTask. Gestiona tu tiempo con IA.
            </p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
