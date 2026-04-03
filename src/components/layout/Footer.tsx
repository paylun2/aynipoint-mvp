"use client"
import Link from "next/link";
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  
  // Optional: Hide footer on app interfaces like POS or Dashboards if needed,
  // but the user wants global consistency. We'll show it everywhere unless inside an iframe or deep dashboard if preferred later.
  // For now, let's keep it strictly global.
  
  return (
    <footer className="bg-[#060B14] pt-24 pb-10 border-t border-slate-800/50 text-slate-400 relative overflow-hidden mt-auto">
      {/* Subtle noise */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16 mb-20">

          <div className="col-span-1 md:col-span-5 lg:col-span-4">
            <Link href="/" className="flex items-center gap-2 mb-6 cursor-pointer group w-max">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center text-primary text-sm font-black shadow-[0_0_15px_rgba(245,158,11,0.3)] group-hover:scale-110 transition-transform">A</div>
              <span className="font-black text-white text-xl tracking-tight">AyniPoint</span>
            </Link>
            <p className="text-sm leading-relaxed font-light text-slate-500 max-w-sm mb-8">
              El nuevo estándar de reciprocidad comercial en Latinoamérica. Conectamos comercios locales con sus clientes reales a través de tecnología sin fricción.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-accent hover:text-primary hover:border-accent transition-all cursor-pointer text-sm font-black shadow-sm hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:-translate-y-1">𝕏</a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-accent hover:text-primary hover:border-accent transition-all cursor-pointer text-sm font-black shadow-sm hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:-translate-y-1">in</a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-accent hover:text-primary hover:border-accent transition-all cursor-pointer text-sm font-black shadow-sm hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:-translate-y-1">ig</a>
            </div>
          </div>

          <div className="col-span-1 md:col-span-7 lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-10">
            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide text-sm">Plataforma</h4>
              <ul className="space-y-4 text-sm font-light">
                <li><Link href="/wallet" className="hover:text-accent transition-colors flex items-center gap-2 group"><div className="w-1 h-1 bg-accent rounded-full opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all"></div>Billetera B2C</Link></li>
                <li><Link href="/login?type=business" className="hover:text-accent transition-colors flex items-center gap-2 group"><div className="w-1 h-1 bg-accent rounded-full opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all"></div>Terminal POS web</Link></li>
                <li><Link href="/login?type=business" className="hover:text-accent transition-colors flex items-center gap-2 group"><div className="w-1 h-1 bg-accent rounded-full opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all"></div>Para Comercios</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide text-sm">Recursos</h4>
              <ul className="space-y-4 text-sm font-light">
                <li><Link href="/enterprise" className="hover:text-accent transition-colors flex items-center gap-2 group"><div className="w-1 h-1 bg-accent rounded-full opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all"></div>Programa Sponsors <span className="text-[9px] font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded ml-1">NUEVO</span></Link></li>
                <li><Link href="/pricing" className="hover:text-accent transition-colors flex items-center gap-2 group"><div className="w-1 h-1 bg-accent rounded-full opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all"></div>Precios B2B</Link></li>
                <li><a href="https://wa.me/something" className="hover:text-accent transition-colors flex items-center gap-2 group"><div className="w-1 h-1 bg-accent rounded-full opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all"></div>Soporte (WhatsApp)</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide text-sm">Compañía</h4>
              <ul className="space-y-4 text-sm font-light">
                <li><Link href="/legal/terms" className="hover:text-accent transition-colors flex items-center gap-2 group"><div className="w-1 h-1 bg-accent rounded-full opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all"></div>Términos y Condiciones</Link></li>
                <li><Link href="/legal/privacy" className="hover:text-accent transition-colors flex items-center gap-2 group"><div className="w-1 h-1 bg-accent rounded-full opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all"></div>Políticas de Privacidad</Link></li>
                <li><a href="#" className="hover:text-accent transition-colors flex items-center gap-2 group"><div className="w-1 h-1 bg-accent rounded-full opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all"></div>Libro de Reclamaciones</a></li>
              </ul>
            </div>
          </div>

        </div>

        <div className="border-t border-slate-800/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm font-light">Copyright &copy; {new Date().getFullYear()} Aynipoint. Hecho con ❤️ para LatAm.</p>
          <div className="text-sm font-light flex gap-6">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Sistemas Operativos</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
