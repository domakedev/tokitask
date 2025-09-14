"use client";
import React from "react";
import { motion } from "framer-motion";

const features = [
  {
    icon: "⚡",
    title: "Eficiencia Máxima",
    description: "Optimiza tu tiempo con algoritmos de IA que analizan tus patrones y ordenan tus tareas de manera inteligente."
  },
  {
    icon: "🎯",
    title: "Personalización Total",
    description: "Adapta la app a tu estilo de vida. Configura tu horario diario y tu hora de fin del día."
  },
  {
    icon: "🔄",
    title: "Sincronización Inteligente",
    description: "Tus cambios se sincronizan automáticamente en todos tus dispositivos."
  },
  {
    icon: "⏰",
    title: "Gestión del Tiempo Libre",
    description: "La IA calcula automáticamente tu tiempo disponible y te ayuda a distribuirlo eficientemente entre tus tareas."
  }
];

const Features = () => {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black to-slate-900">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Potencia tu <span className="text-cyan-400">productividad</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Descubre cómo la IA revoluciona la gestión de tu tiempo diario
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 h-full hover:bg-slate-800/70 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10">
                <motion.div
                  className="text-4xl mb-4"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  {feature.icon}
                </motion.div>

                <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                  {feature.title}
                </h3>

                <p className="text-slate-300 leading-relaxed">
                  {feature.description}
                </p>

                {/* Efecto de brillo en hover */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Estadísticas */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          {[
            { number: "85%", label: "Más eficiente" },
            { number: "2.5h", label: "Tiempo ahorrado diario" },
            { number: "95%", label: "Satisfacción usuarios" },
            { number: "24/7", label: "Sincronización IA" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              className="group"
            >
              <div className="text-3xl sm:text-4xl font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors mb-2">
                {stat.number}
              </div>
              <div className="text-slate-400 text-sm font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;