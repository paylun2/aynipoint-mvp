"use client"
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Add scroll listener for Navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Determine if we should show the transparent or solid bar based on route
  const isLanding = pathname === '/';
  
  // Base classes for the nav
  const navClasses = `fixed w-full z-50 top-0 transition-all duration-300 ${
    scrolled || !isLanding 
      ? 'bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm py-3' 
      : 'bg-transparent py-5'
  }`;

  // Text color based on context
  const textColorClass = (!isLanding || scrolled) ? 'text-slate-800 dark:text-white' : 'text-white';
  const linkColorClass = (!isLanding || scrolled) ? 'text-slate-600 dark:text-slate-300 hover:text-accent dark:hover:text-white' : 'text-slate-300 hover:text-white';

  return (
    <nav className={navClasses}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          {/* Logo de Aynipoint */}
          <Link href="/" className="flex items-center gap-2 cursor-pointer group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center text-primary font-bold shadow-lg shadow-accent/30 group-hover:scale-110 transition-transform">A</div>
            <span className={`text-xl font-bold tracking-tight transition-colors ${textColorClass}`}>AyniPoint</span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`hidden md:flex items-center gap-8 text-sm font-medium ${linkColorClass}`}
        >
          {isLanding ? (
            <>
              <a href="#beneficios" className="transition-colors">Beneficios</a>
              <a href="#para-negocios" className="transition-colors">Para Negocios</a>
              <Link href="/enterprise" className="transition-colors">Sponsors</Link>
              <a href="#faq" className="transition-colors">Preguntas Frecuentes</a>
            </>
          ) : (
             <>
              <Link href="/" className="transition-colors">Inicio</Link>
              <Link href="/enterprise" className="transition-colors">Sponsors</Link>
             </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="hidden md:flex items-center gap-4"
        >
          <Link href="/login" className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors ${!isLanding || scrolled ? 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800' : 'border-slate-600 text-white hover:bg-slate-800'}`}>
            Iniciar Sesión
          </Link>
          <Link href="/login?type=business" className="relative group bg-accent hover:bg-amber-400 text-primary px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-accent/20 hover:-translate-y-0.5 overflow-hidden">
            <span className="relative z-10">Crear Cuenta Gratis</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          </Link>
        </motion.div>

        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`md:hidden p-2 ${textColorClass}`}>
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 shadow-xl py-4 px-6 flex flex-col gap-4"
        >
          {isLanding ? (
            <>
              <a href="#beneficios" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-600 dark:text-slate-300 font-medium py-2">Beneficios</a>
              <a href="#para-negocios" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-600 dark:text-slate-300 font-medium py-2">Para Negocios</a>
              <Link href="/enterprise" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-600 dark:text-slate-300 font-medium py-2">Sponsors</Link>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-600 dark:text-slate-300 font-medium py-2 border-b border-slate-200 dark:border-slate-800 mb-2">Preguntas Frecuentes</a>
            </>
          ) : (
            <>
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-600 dark:text-slate-300 font-medium py-2">Inicio</Link>
              <Link href="/enterprise" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-600 dark:text-slate-300 font-medium py-2 border-b border-slate-200 dark:border-slate-800 mb-2">Sponsors</Link>
            </>
          )}

          <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center px-5 py-3 rounded-xl text-sm font-bold border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            Iniciar Sesión
          </Link>
          <Link href="/login?type=business" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center bg-accent hover:bg-amber-400 text-primary px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-accent/20">
            Crear Cuenta Gratis
          </Link>
        </motion.div>
      )}
    </nav>
  );
}
