import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen({ message = "Chargement de la borne..." }) {
  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-center text-white">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 mb-8 relative">
           <motion.div 
             animate={{ rotate: 360 }}
             transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
             className="absolute inset-0 border-4 border-white/20 rounded-3xl"
           />
           <span className="text-4xl font-black italic">B</span>
        </div>
        
        <h1 className="text-3xl font-black tracking-tighter mb-2">BOUTIDIDACT</h1>
        <div className="flex items-center gap-2 text-indigo-300 font-medium">
          <Loader2 className="animate-spin" size={18} />
          {message}
        </div>

        {/* Progress bar simulation */}
        <div className="w-48 h-1 bg-white/10 rounded-full mt-8 overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full bg-indigo-500"
          />
        </div>
      </motion.div>
      
      <p className="absolute bottom-10 text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">
        v3.0 SaaS Edition
      </p>
    </div>
  );
}
