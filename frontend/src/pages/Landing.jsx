import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Landing = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState(null)

  // Cotizaciones estáticas para el ticker
  const cotizaciones = [
    { name: 'Dólar MEP', value: '$1.248,50', change: '-0.3%', positive: false },
    { name: 'Dólar CCL', value: '$1.284,20', change: '+0.5%', positive: true },
    { name: 'S&P Merval', value: '1.580.400', change: '+2.8%', positive: true },
    { name: 'Plazo Fijo TNA', value: '35.0%', change: 'Estable', positive: true },
    { name: 'Rendimiento FCI MM', value: '38.2% TEA', change: '+1.2%', positive: true },
    { name: 'CEDEAR AAPL', value: '$12.450', change: '+1.4%', positive: true },
  ]

  // Los 10 módulos educativos de Invertite
  const modulos = [
    { order: 1, title: 'Fundamentos del Dinero', desc: 'Entendé cómo funciona la inflación, el interés compuesto y el ahorro en Argentina.', color: 'border-emerald-500/20 text-emerald-400' },
    { order: 2, title: 'Sistema Financiero Argentino', desc: 'BCRA, CNV, BYMA, Merval y cómo abrir tu primera cuenta comitente en un broker.', color: 'border-teal-500/20 text-teal-400' },
    { order: 3, title: 'Plazo Fijo y Depósitos', desc: 'TNA vs TEA, inflación real, plazos fijos tradicionales y opción UVA para ganarle a la devaluación.', color: 'border-cyan-500/20 text-cyan-400' },
    { order: 4, title: 'Fondos Comunes de Inversión', desc: 'Diversificación inteligente en pesos. Rescate inmediato (Money Market) y renta fija/variable.', color: 'border-blue-500/20 text-blue-400' },
    { order: 5, title: 'Bonos y Renta Fija', desc: 'Letras del Tesoro (LECAPs), obligaciones negociables en dólares y cómo calcular la TIR.', color: 'border-indigo-500/20 text-indigo-400' },
    { order: 6, title: 'Acciones del Merval', desc: 'Comprá empresas argentinas. Análisis fundamental, dividendos, ratio P/E y sectores estratégicos.', color: 'border-violet-500/20 text-violet-400' },
    { order: 7, title: 'CEDEARs y Mercado Global', desc: 'Invertí en Apple, Google, Coca-Cola o ETFs desde pesos con cobertura de tipo de cambio.', color: 'border-purple-500/20 text-purple-400' },
    { order: 8, title: 'Dólar Financiero y Cobertura', desc: 'Cómo operar dólar MEP/CCL de forma legal, futuros y cobertura cambiaria avanzada.', color: 'border-fuchsia-500/20 text-fuchsia-400' },
    { order: 9, title: 'Construcción de Portafolio', desc: 'Armado de carteras según tu perfil (conservador/agresivo), rebalanceo y métricas.', color: 'border-rose-500/20 text-rose-400' },
    { order: 10, title: 'Impuestos y Aspecto Legal', desc: 'Impuesto a las ganancias, Bienes Personales sobre activos financieros y declaración jurada.', color: 'border-amber-500/20 text-amber-400' },
  ]

  // Configuración de los 3 planes principales
  const planes = [
    {
      name: 'Plan Mensual',
      slug: 'mensual',
      price: '$4.990',
      period: 'por mes',
      features: [
        'Acceso completo a los 10 módulos',
        'Lecciones teóricas y prácticas',
        'Simulador financiero avanzado',
        'Consultas ilimitadas al Tutor IA',
        'Soporte de la comunidad'
      ],
      cta: 'Comenzar Suscripción',
      accent: 'border-slate-800'
    },
    {
      name: 'Plan Anual',
      slug: 'anual',
      price: '$39.990',
      period: 'por año',
      features: [
        'Acceso completo a todo el contenido',
        'Ahorrás 2 meses de suscripción',
        'Certificado digital de completion',
        'Badge exclusivo "Inversor Anual"',
        'Acceso prioritario a nuevos módulos',
        'Sesión grupal mensual con tutores'
      ],
      cta: 'Adquirir Plan Anual',
      recommended: true,
      accent: 'border-accent-teal shadow-lg shadow-accent-teal/10'
    },
    {
      name: 'Plan Vitalicio',
      slug: 'vitalicio',
      price: '$149.990',
      period: 'pago único',
      features: [
        'Acceso de por vida ilimitado',
        'Todas las funciones premium y futuras',
        'Badge exclusivo "Inversor Vitalicio"',
        'Grupo VIP privado en Telegram',
        'Soporte prioritario 24/7'
      ],
      cta: 'Comprar de por Vida',
      accent: 'border-accent-blue shadow-lg shadow-accent-blue/10'
    }
  ]

  const handlePlanSelection = (plan) => {
    if (!isAuthenticated) {
      navigate('/registro', { state: { planSlug: plan.slug } })
    } else {
      navigate(`/pagar/${plan.slug}`)
    }
  }

  return (
    <div className="bg-invertite-dark text-slate-100 min-h-screen selection:bg-accent-teal selection:text-invertite-dark font-sans overflow-x-hidden">
      
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-invertite-dark/80 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black tracking-tight text-white flex items-center">
                INVERT<span className="text-accent-teal">ITE</span>
                <span className="ml-2 bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                  Beta
                </span>
              </span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#modulos" className="text-sm font-medium text-slate-400 hover:text-accent-teal transition-colors">Módulos</a>
              <a href="#tutor" className="text-sm font-medium text-slate-400 hover:text-accent-teal transition-colors">Tutor IA</a>
              <a href="#planes" className="text-sm font-medium text-slate-400 hover:text-accent-teal transition-colors">Planes</a>
            </div>

            {/* CTA */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link to="/dashboard" className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-accent-teal to-teal-600 text-invertite-dark hover:brightness-110 active:scale-[0.98] transition-all">
                  Mi Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                    Iniciar Sesión
                  </Link>
                  <Link to="/registro" className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white transition-all">
                    Registrarse
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── TICKER DE COTIZACIONES ── */}
      <div className="bg-slate-950 border-y border-slate-900 py-3 overflow-hidden select-none">
        <div className="flex whitespace-nowrap animate-[marquee_25s_linear_infinite] space-x-12">
          {cotizaciones.concat(cotizaciones).map((cot, idx) => (
            <div key={idx} className="inline-flex items-center space-x-2 text-sm font-semibold">
              <span className="text-slate-500">{cot.name}</span>
              <span className="text-slate-100">{cot.value}</span>
              <span className={cot.positive ? 'text-emerald-400' : 'text-rose-400'}>
                {cot.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── HERO SECTION ── */}
      <header className="relative py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-accent-teal/10 border border-accent-teal/20 px-4 py-1.5 rounded-full text-accent-teal text-xs font-bold uppercase tracking-widest">
            <span>🎯 Educación Financiera Argentina</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white leading-tight">
            Invertí con confianza desde el <span className="bg-gradient-to-r from-accent-teal to-accent-blue bg-clip-text text-transparent">primer peso</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
            Aprendé a proteger tus ahorros de la inflación, operar dólar MEP y construir un portafolio diversificado con explicaciones simples y asistencia de nuestro Tutor IA.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6">
            <a href="#planes" className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-accent-teal text-invertite-dark hover:bg-accent-teal/90 shadow-lg shadow-accent-teal/20 transition-all active:scale-[0.98]">
              Ver Planes y Precios
            </a>
            <Link to="/registro" className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white transition-all">
              Comenzar gratis
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto mt-20 pt-10 border-t border-slate-900">
          {[
            { value: '+10.000', label: 'Alumnos Activos' },
            { value: '10', label: 'Módulos de Estudio' },
            { value: '50', label: 'Lecciones Prácticas' },
            { value: '24/7', label: 'Tutoría con IA RAG' }
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-4xl font-extrabold text-white">{stat.value}</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mt-1 font-semibold">{stat.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* ── SECCIÓN MÓDULOS ── */}
      <section id="modulos" className="py-24 bg-slate-950 border-y border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Estructura de Aprendizaje Paso a Paso
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm">
              Desde conceptos básicos hasta estrategias avanzadas de cobertura cambiaria y fiscales.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {modulos.map((mod) => (
              <div key={mod.order} className={`bg-invertite-card border ${mod.color} p-6 rounded-2xl flex flex-col justify-between hover:scale-[1.02] hover:-translate-y-1 transition-all`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-60">Módulo {mod.order}</span>
                    <span className="h-2 w-2 rounded-full bg-current"></span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{mod.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-light">{mod.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN TUTOR IA ── */}
      <section id="tutor" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-accent-teal">IA Tutor Integrado</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Un tutor financiero disponible 24/7 para vos
            </h2>
            <p className="text-slate-400 font-light leading-relaxed">
              ¿No entendés un concepto en la lección? ¿Querés saber cómo impacta la cotización del dólar en tu portafolio? Chateá con nuestro Tutor inteligente dotado con tecnología **RAG** que busca respuestas precisas basadas en los módulos de estudio y cotizaciones en vivo.
            </p>
            <div className="space-y-3">
              {[
                'Respuestas claras, sin tecnicismos complejos',
                'Contextualizado con ejemplos reales del mercado argentino',
                'Analiza e interpreta tu lección actual'
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-center space-x-3 text-sm text-slate-300">
                  <span className="text-accent-teal">✓</span>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Simulador visual de chat */}
          <div className="bg-invertite-card rounded-3xl border border-slate-900 p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent-teal to-accent-blue"></div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <h4 className="text-sm font-bold text-white">Tutor Invertite</h4>
                  <span className="text-[10px] text-emerald-400 flex items-center font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1"></span>
                    En línea
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 h-60 overflow-y-auto pr-1 text-xs">
              <div className="bg-slate-900 p-3 rounded-2xl rounded-tr-none ml-8 text-slate-300">
                Che, ¿qué es mejor en Argentina, Plazo Fijo o FCI Money Market?
              </div>
              <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none mr-8 text-slate-300 leading-relaxed space-y-2">
                <p>Mirá, depende de tu objetivo:</p>
                <p>El **Plazo Fijo** te ofrece una tasa fija (ej: 35% TNA), pero tenés que trabar los pesos mínimo 30 días.</p>
                <p>Un **FCI Money Market** rinde un poco menos (alrededor de 38% TEA), pero tenés **rescate inmediato**. Podés sacar los pesos en cualquier momento para pagar cuentas.</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-900 flex items-center justify-between">
              <span className="text-slate-600 text-xs font-light">Escribí tu pregunta...</span>
              <button className="bg-accent-teal/10 hover:bg-accent-teal/20 text-accent-teal px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                Enviar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN PLANES ── */}
      <section id="planes" className="py-24 bg-slate-950 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Planes Adaptados a tus Metas
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm">
              Accedé a todo el conocimiento y soporte interactivo de por vida o de forma mensual.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {planes.map((plan) => (
              <div key={plan.slug} className={`bg-invertite-card border ${plan.accent} rounded-3xl p-8 flex flex-col justify-between relative`}>
                {plan.recommended && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent-teal text-invertite-dark text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border border-teal-400/30">
                    Recomendado
                  </span>
                )}
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <div className="flex items-baseline mt-4">
                      <span className="text-4xl font-black text-white">{plan.price}</span>
                      <span className="text-xs text-slate-500 ml-2 font-medium">/ {plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs text-slate-400 font-light border-t border-slate-900 pt-6">
                    {plan.features.map((feat, index) => (
                      <li key={index} className="flex items-center space-x-2.5">
                        <span className="text-accent-teal text-base">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8 mt-auto">
                  <button 
                    onClick={() => handlePlanSelection(plan)}
                    className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${plan.recommended ? 'bg-accent-teal text-invertite-dark hover:brightness-110 shadow-md shadow-accent-teal/10' : 'bg-slate-900 hover:bg-slate-800 text-slate-200'}`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER Y DISCLAIMER LEGAL ── */}
      <footer className="bg-slate-950 border-t border-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-900 pb-8 gap-4">
            <span className="text-xl font-black text-white">INVERT<span className="text-accent-teal">ITE</span></span>
            <p className="text-xs text-slate-600 font-medium">© 2026 Invertite. Todos los derechos reservados.</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-900/60 p-6 rounded-2xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Disclaimer Legal e Informativo</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-light">
              Invertite es una plataforma exclusivamente de carácter formativo y educativo. No proporcionamos asesoría de inversión personalizada, ni recomendaciones directas o indirectas para la adquisición o venta de activos financieros específicos. Las opiniones, simulaciones y contenidos provistos no deben ser interpretados como recomendaciones financieras oficiales. Toda inversión en el mercado bursátil conlleva riesgos, incluyendo la posible pérdida del capital inicial. Los rendimientos pasados no garantizan resultados futuros.
            </p>
          </div>
        </div>
      </footer>

      {/* CSS animaciones personalizadas adicionales inline si es necesario */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}

export default Landing
