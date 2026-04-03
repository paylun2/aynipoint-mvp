"use client"
import Link from "next/link";
import { ChevronDown, Rocket, Zap, BarChart3, ShieldCheck, PlusCircle } from "lucide-react";
import { motion, Variants } from "framer-motion";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";

export default function Home() {
  // Animation variants

  // Animation variants
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-orange-500/30 selection:text-orange-500 bg-[#050505] text-white overflow-x-hidden flex flex-col">

      {/* 1. CABECERA FIJA (Sticky Navbar) */}
      <Navigation />

      <main className="flex-1 w-full flex flex-col">
        {/* 2. SECCIÓN HERO (El Gancho Principal) */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden bg-[#050505] text-white min-h-[90vh] flex items-center">
          {/* Animated Background Gradients */}
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] pointer-events-none"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none"
          />
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="text-center lg:text-left pt-10"
            >
              <motion.div variants={fadeUp} className="inline-block px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 backdrop-blur-md mb-8 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <span className="text-xs font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                  </span>
                  La red de reciprocidad B2B2C
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1] font-['Plus_Jakarta_Sans']">
                Tus clientes regresan, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-amber-200 to-white">tus ventas se elevan.</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg md:text-xl text-slate-400 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
                Aynipoint unifica la fidelidad local. Recompensa a tus clientes con solo dictar su número. Sin tarjetas físicas ni fricción en caja.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto lg:mx-0">
                <Link href="/login?type=business" className="group relative flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-[#050505] rounded-2xl font-black overflow-hidden shadow-[0_0_40px_rgba(249,115,22,0.4)] transition-all hover:scale-[1.03] hover:shadow-[0_0_60px_rgba(249,115,22,0.6)] border border-orange-300/50">
                  <span className="relative z-10 text-lg tracking-tight">Impulsa tu Negocio</span>
                  <Rocket className="w-5 h-5 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-amber-400 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>

                <Link href="/login" className="flex items-center justify-center gap-2 px-8 py-4 bg-[#111] backdrop-blur-md text-white rounded-2xl font-bold border border-white/10 transition-all hover:bg-[#1a1a1a] hover:border-white/30 shadow-[inset_0_2px_10px_rgba(255,255,255,0.02)] group">
                  <span className="tracking-wide">Soy Cliente B2C</span>
                  <ChevronDown className="w-4 h-4 text-white/40 group-hover:text-white group-hover:-rotate-90 transition-all" />
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500">
                <div className="flex -space-x-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#0A0F1C] bg-amber-200" />
                  <div className="w-8 h-8 rounded-full border-2 border-[#0A0F1C] bg-emerald-200" />
                  <div className="w-8 h-8 rounded-full border-2 border-[#0A0F1C] bg-blue-200" />
                  <div className="w-8 h-8 rounded-full border-2 border-[#0A0F1C] bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">+2K</div>
                </div>
                <p>Negocios ya afiliados</p>
              </motion.div>
            </motion.div>

            {/* Elemento Visual Derecha (3D / Glassmorphism Mockups) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
              className="relative mx-auto w-full max-w-lg lg:max-w-none pt-10 lg:pt-0 perspective-1000"
            >
              <div className="relative h-[550px] w-full bg-gradient-to-br from-slate-800/40 to-[#0A0F1C]/80 rounded-[40px] border border-slate-700/50 shadow-2xl backdrop-blur-xl p-8 flex flex-col justify-center items-center group">

                {/* Glow Effect behind mockups */}
                <div className="absolute inset-0 bg-accent/5 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[50px]"></div>

                {/* Mockup POS Terminal (Floating Top) */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200/50 transform rotate-[-4deg] md:-ml-8 w-full max-w-sm relative z-20 backdrop-blur-sm"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">AyniPoint POS</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full"><ShieldCheck className="w-3 h-3" /> En línea</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center mb-4 shadow-inner">
                    <div className="font-mono text-3xl font-black tracking-widest text-[#0F172A]">999 123 456</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Nro de Cliente</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, "Del", 0, ".00"].map((n, i) => (
                      <div key={i} className="bg-slate-100/50 outline outline-1 outline-slate-200 h-10 rounded-xl flex items-center justify-center font-bold text-slate-600 text-sm">{n}</div>
                    ))}
                  </div>
                  <div className="bg-accent text-primary p-3 rounded-xl flex justify-center items-center gap-2 font-bold text-sm shadow-[0_4px_15px_rgba(245,158,11,0.3)]">
                    <PlusCircle className="w-4 h-4" /> Entregar Puntos
                  </div>
                </motion.div>

                {/* Mockup B2C Wallet (Floating Bottom) */}
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="bg-[#0F172A]/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-slate-700/80 transform rotate-[3deg] md:-mr-12 w-full max-w-sm relative z-30 -mt-8 md:-mt-16"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-amber-200 p-[2px]">
                      <div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-white">C</div>
                    </div>
                    <div>
                      <div className="text-white font-bold text-md tracking-tight">Hola, Carlos 👋</div>
                      <div className="text-emerald-400 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Identidad Soberana</div>
                    </div>
                  </div>
                  <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/50 shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center"><Zap className="w-3 h-3" /></div>
                        <span className="text-slate-200 font-bold text-sm tracking-tight">Botica Fasa</span>
                      </div>
                      <span className="text-accent text-xl font-mono font-black drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">1,600 <span className="text-[10px] text-slate-400">pts</span></span>
                    </div>
                    <div className="w-full bg-slate-900/50 rounded-full h-2 mt-4 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '80%' }}
                        transition={{ duration: 1.5, delay: 1 }}
                        className="bg-gradient-to-r from-accent to-emerald-400 h-2 rounded-full relative"
                      >
                        <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]"></div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* 3. SECCIÓN DE PRUEBA SOCIAL (Trust Badges) */}
        <section className="bg-[#0a0a0a] py-10 border-b border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/50 dark:via-slate-800/20 to-transparent"></div>
          <div className="max-w-7xl mx-auto px-6 text-center text-white/60 p-2 relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-8 text-white/50">Marcas y comercios que ya operan con reciprocidad</p>
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-80 hover:opacity-100 transition-opacity duration-700">
              {/* Trust Logos (Text-based for now) */}
              <div className="font-black text-2xl tracking-tighter text-white/80">MARKET<span className="text-white">PLUS</span></div>
              <div className="font-bold text-2xl font-mono text-white/80">Coffee<span className="text-orange-400 italic">House</span></div>
              <div className="font-black text-2xl tracking-widest text-white/80">RESTO<span className="font-light text-white">BAR</span></div>
              <div className="font-bold text-2xl text-white/80 flex items-center gap-1"><Zap className="w-6 h-6 text-emerald-400" /> FAST<span className="text-white">TECH</span></div>
            </div>
          </div>
        </section>

        {/* 4. PROPUESTA DE VALOR B2B */}
        <section id="para-negocios" className="py-32 bg-[#050505] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mb-20"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-slate-900 dark:text-white leading-[1.1] tracking-tight">Hoy te eligieron, <br /><span className="text-accent">mañana recompénsalos.</span></h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                Tus clientes ya dieron el primer paso al preferir tu marca frente a la competencia; ahora es tu momento de devolverles el gesto.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {[
                { icon: Rocket, title: "Cero Hardware Extra", desc: "Usa la tablet o el celular que ya tienes. Sin instalaciones complejas ni datáfonos extra. Funciona en cualquier navegador de forma inmediata.", color: "blue" },
                { icon: Zap, title: "Fricción Cero en Caja", desc: "Tus clientes no descargan apps estando en la fila. Solo te dictan su número de celular y el sistema les crea una 'Cuenta Sombra' en milisegundos.", color: "emerald" },
                { icon: BarChart3, title: "Multiplica tus Ventas", desc: "Los clientes con puntos vuelven un 40% más rápido a tu local para alcanzar su próximo premio. Mide tu progreso en un Dashboard en vivo.", color: "amber" }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.2 }}
                  whileHover={{ y: -10 }}
                  className="bg-[#0a0a0a] p-10 rounded-[32px] border border-white/5 shadow-2xl hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,1)] hover:border-white/10 transition-all group relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-${item.color}-500/10 rounded-full blur-[40px] group-hover:bg-${item.color}-500/20 transition-colors`}></div>
                  <div className={`w-14 h-14 bg-${item.color}-500/10 border border-${item.color}-500/20 rounded-2xl flex items-center justify-center text-${item.color}-400 mb-8 transform group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-center md:text-left"
            >
              <Link href="/login?type=business" className="inline-block px-8 py-4 bg-[#0F172A] hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl font-bold transition-all shadow-[0_10px_30px_-10px_rgba(15,23,42,0.5)] hover:-translate-y-1 hover:shadow-xl">
                Registra tu negocio gratis
              </Link>
            </motion.div>
          </div>
        </section>

        {/* 5. CÓMO FUNCIONA (El Modelo Supermercado) */}
        <section className="py-32 bg-[#0a0a0a] overflow-hidden relative border-t border-white/5">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent -z-10"></div>

          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-24"
            >
              <p className="text-accent font-bold uppercase tracking-widest mb-3">La Metodología Aynipoint</p>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">El flujo perfecto. Fricción cero.</h2>
            </motion.div>

            {/* Paso 1 */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="flex flex-col md:flex-row items-center gap-12 lg:gap-20 mb-32 relative"
            >
              <div className="flex-1 md:pr-4 z-10">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent font-black text-xl mb-6 border border-accent/20">1</div>
                <h3 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">Compra y Dicta</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-light mb-6">En la caja de tu local favorito, simplemente dicta tu número de celular para ganar puntos base. Fricción cero, sin demoras para los demás clientes en la fila.</p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><ShieldCheck className="w-5 h-5 text-emerald-500" /> Sin descargar Apps</li>
                  <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><ShieldCheck className="w-5 h-5 text-emerald-500" /> Toma solo 3 segundos</li>
                </ul>
              </div>
              <div className="flex-1 w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 aspect-[4/3] rounded-[40px] flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 shadow-2xl relative overflow-hidden group">
                {/* Visual Representation 1 */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/50 dark:from-slate-900/80 to-transparent z-10"></div>
                <div className="relative z-20 bg-gradient-to-b from-[#111] to-[#0a0a0a] p-6 flex flex-col items-center justify-center rounded-3xl shadow-[0_20px_50px_-15px_rgba(0,0,0,1)] border border-emerald-500/10 transform group-hover:scale-105 transition-transform duration-500 w-[70%]">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center rounded-full mb-4">
                    <Zap className="w-8 h-8" />
                  </div>
                  <div className="text-2xl font-black text-slate-800 dark:text-white font-mono tracking-widest text-center">987 654 321</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Número dictado</div>
                </div>
              </div>
            </motion.div>

            {/* Paso 2 */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-20 mb-32 relative"
            >
              <div className="flex-1 md:pl-4 z-10">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 font-black text-xl mb-6 border border-blue-500/20">2</div>
                <h3 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">Descubre y Vincula</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-light mb-6">Entra a la web con tu cuenta de Google y vincula tu número mediante un código OTP seguro para revelar todas tus "Cuentas Sombra" acumuladas en las tiendas.</p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><ShieldCheck className="w-5 h-5 text-blue-500" /> SSO Seguro vía Google/Apple</li>
                  <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><ShieldCheck className="w-5 h-5 text-blue-500" /> OTP por WhatsApp Instantáneo</li>
                </ul>
              </div>
              <div className="flex-1 w-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 aspect-[4/3] rounded-[40px] flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 shadow-2xl relative overflow-hidden group">
                {/* Visual Representation 2 */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay"></div>
                <div className="relative z-20 flex items-center justify-center gap-6 transform group-hover:scale-105 transition-transform duration-500">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 animate-[bounce_3s_ease-in-out_infinite]">
                    <svg className="w-10 h-10" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                  </div>
                  <div className="h-1 bg-slate-200 dark:bg-slate-700 w-12 flex relative">
                    <div className="absolute top-0 left-0 h-full bg-blue-500 w-full animate-[progress_2s_ease-in-out_infinite]"></div>
                  </div>
                  <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg font-bold">
                    WhatsApp OTP
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Paso 3 */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="flex flex-col md:flex-row items-center gap-12 lg:gap-20"
            >
              <div className="flex-1 md:pr-4 z-10">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 font-black text-xl mb-6 border border-amber-500/20">3</div>
                <h3 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">Caza y Canjea</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-light mb-6">Genera tu código de seguridad (TOTP) de 4 dígitos cuando quieras retirar premios locales de forma presencial o usa puntos para cazar códigos QR.</p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><ShieldCheck className="w-5 h-5 text-amber-500" /> TOTP Criptográfico (Expira)</li>
                  <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><ShieldCheck className="w-5 h-5 text-amber-500" /> Prevención total de fraudes</li>
                </ul>
              </div>
              <div className="flex-1 w-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 aspect-[4/3] rounded-[40px] flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 shadow-2xl relative overflow-hidden group">
                {/* Visual Representation 3 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-amber-500/20 blur-[60px] rounded-full"></div>
                <div className="relative z-20 bg-[#050505] border border-amber-500/20 p-8 rounded-3xl shadow-[0_20px_50px_-15px_rgba(245,158,11,0.1)] transform group-hover:scale-105 transition-transform duration-500">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center mb-4">Tu Código Seguro</div>
                  <div className="flex gap-2 justify-center mb-6">
                    {['A', '7', 'X', '2'].map((char, i) => (
                      <div key={i} className="w-14 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-3xl font-black font-mono text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-inner">
                        {char}
                      </div>
                    ))}
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="h-full bg-amber-500"
                    ></motion.div>
                  </div>
                  <div className="text-center text-[10px] text-slate-400 mt-2 font-bold uppercase">Expira en 10s</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 6. EL MÓDULO DE PRECIOS */}
        <section id="precios" className="py-32 bg-[#050505] border-t border-white/5 relative overflow-hidden">
          {/* Subtle Background Elements */}
          <div className="absolute top-1/4 left-0 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-slate-900 dark:text-white tracking-tight">Inicia gratis, <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-amber-500">escala seguro.</span></h2>
              <p className="text-xl text-slate-500 max-w-2xl mx-auto font-light">Modelos diseñados para adaptarse al tamaño y velocidad de tu negocio.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">

              {/* Plan Semilla */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-b from-[#111] to-[#0a0a0a] rounded-[32px] p-10 border border-white/5 shadow-[0_20px_50px_-15px_rgba(0,0,0,1)] hover:border-white/10 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,1)] transition-all flex flex-col relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-bl-full -z-10"></div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Plan Semilla</h3>
                <div className="mb-6 flex items-end"><span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">S/ 0</span><span className="text-slate-500 ml-2 mb-1 font-medium">/ mes</span></div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-10 leading-relaxed">Ideal para validar la tracción en un comercio individual. Sin tarjetas de crédito.</p>

                <ul className="space-y-5 mb-10 flex-1 text-sm md:text-base text-slate-700 dark:text-slate-300 font-medium">
                  <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-slate-400" /> Hasta 100 clientes activos</li>
                  <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-slate-400" /> 5 premios en catálogo</li>
                  <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-slate-400" /> 1 Perfil de Administrador</li>
                  <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-slate-400" /> Terminal POS Web</li>
                </ul>

                <Link href="/login?type=business" className="block text-center w-full py-4 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl font-bold transition-colors">
                  Empezar Gratis
                </Link>
              </motion.div>

              {/* Plan Crecimiento */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] text-white rounded-[32px] p-10 border border-orange-500/20 shadow-[0_30px_60px_-15px_rgba(249,115,22,0.15)] hover:shadow-[0_40px_80px_-15px_rgba(249,115,22,0.25)] flex flex-col relative transform md:-translate-y-4 overflow-hidden group transition-all"
              >
                {/* Glow Backdrop */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent pointer-events-none"></div>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/20 rounded-full blur-[60px] group-hover:bg-accent/30 transition-colors"></div>

                <div className="absolute top-8 right-8 bg-gradient-to-r from-accent to-amber-500 text-primary text-xs font-black uppercase py-1.5 px-4 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)] transform -rotate-2">Más Popular</div>

                <h3 className="text-2xl font-black mb-2 tracking-tight text-white relative z-10">Plan Crecimiento</h3>
                <div className="mb-6 flex items-end relative z-10"><span className="text-5xl font-black tracking-tighter text-white">S/ 89</span><span className="text-slate-400 ml-2 mb-1 font-medium">/ mes</span></div>
                <p className="text-slate-400 text-sm mb-10 leading-relaxed font-light relative z-10">Para negocios en expansión física que necesitan control total y múltiples usuarios.</p>

                <ul className="space-y-5 mb-10 flex-1 text-sm md:text-base font-medium relative z-10 text-slate-200">
                  <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-accent" /> <span className="text-white font-bold">Clientes Ilimitados</span></li>
                  <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-accent" /> Catálogo PRO (50 recompensas)</li>
                  <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-accent" /> Múltiples Cajeros (RBAC)</li>
                  <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-accent" /> Analíticas Predictivas en B2B Dashboard</li>
                </ul>

                <Link href="/login?type=business" className="relative group/btn block text-center w-full py-4 bg-accent text-primary rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:scale-[1.02] overflow-hidden z-10">
                  <span className="relative z-20 text-lg">Prueba 14 días</span>
                  <div className="absolute inset-0 w-full h-full bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

      </main>

      {/* 7. PIE DE PÁGINA (Footer) */}
      <Footer />
    </div>
  );
}
