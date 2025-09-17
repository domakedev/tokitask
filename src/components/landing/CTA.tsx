"use client";
import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const CTA = () => {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/login");
  };

  const handleRegister = () => {
    router.push("/login"); // Por ahora redirige a login, ya que la autenticación está integrada ahí
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-cyan-900/20 via-slate-900 to-cyan-900/20">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            ¿Listo para revolucionar
            <span className="block text-cyan-400">tu gestión del tiempo y hábitos?</span>
          </h2>

          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Únete a decenas de usuarios que ya optimizan su día con la ayuda de la IA y construyen hábitos duraderos, de forma gratuita y sencilla, descubre el poder de la organización inteligente y el seguimiento de progreso.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12"
          >
            <motion.button
              onClick={handleLogin}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-lg rounded-lg transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Iniciar Sesión
            </motion.button>

            <motion.button
              onClick={handleRegister}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black font-semibold text-lg rounded-lg transition-all duration-300 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Registrarse
            </motion.button>
          </motion.div>

          {/* Características destacadas */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto"
          >
            {[
              { icon: "🚀", text: "Creación en 2 minutos" },
              { icon: "🔒", text: "Datos seguros y privados" },
              { icon: "💎", text: "Funciones premium gratuitas" }
            ].map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center p-4 bg-slate-800/30 rounded-lg backdrop-blur-sm border border-slate-700/50"
              >
                <span className="text-2xl mb-2">{item.icon}</span>
                <span className="text-slate-300 text-sm font-medium text-center">
                  {item.text}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;