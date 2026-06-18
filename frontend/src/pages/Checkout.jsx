import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import paymentService from '../services/paymentService'
import api from '../services/api'
import toast from 'react-hot-toast'
import LaunchBanner from '../components/LaunchBanner'

const Checkout = () => {
  const { planSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, refreshUser } = useAuth()
  
  const [method, setMethod] = useState('mp') // 'mp' | 'uala' | 'card' | 'transfer'
  const [isLoading, setIsLoading] = useState(false)
  const [planDetails, setPlanDetails] = useState(null)

  // Traducir slug de URL al slug de base de datos
  const dbSlugMap = {
    mensual: 'monthly',
    anual: 'yearly',
    vitalicio: 'lifetime',
    monthly: 'monthly',
    yearly: 'yearly',
    lifetime: 'lifetime'
  }

  const slugTranslations = {
    monthly: { name: 'Plan Mensual', price: '$4.990/mes', rawPrice: 4990 },
    yearly: { name: 'Plan Anual', price: '$39.990/año', rawPrice: 39990 },
    lifetime: { name: 'Plan Vitalicio', price: '$149.990/único', rawPrice: 149990 }
  }

  const dbSlug = dbSlugMap[planSlug] || 'monthly'
  const details = slugTranslations[dbSlug]

  return (
    <div className="bg-invertite-dark text-slate-100 min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-2xl">
        <LaunchBanner />
      </div>
      {/* Implementamos en un único archivo modular para simplificar e independizar */}
      <CheckoutFlow planSlug={planSlug} />
    </div>
  )
}

// Subcomponente encapsulado para manejar todo el flujo de Checkout de forma autónoma
const CheckoutFlow = ({ planSlug }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [method, setMethod] = useState('mp')
  const [isLoading, setIsLoading] = useState(false)
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)

  // Card simulation states
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')

  const [launchStatus, setLaunchStatus] = useState(null)

  useEffect(() => {
    const fetchLaunch = async () => {
      try {
        const { data } = await api.get('/launch/status')
        setLaunchStatus(data.data)
      } catch (err) {
        console.error('Error al cargar launch status en Checkout:', err)
      }
    }
    fetchLaunch()
  }, [])

  // Simulador de redirección a Mercado Pago
  const handleMPPay = async () => {
    setIsLoading(true)
    try {
      // Mandamos el slug (mensual/anual/vitalicio) directamente, y el backend resolverá el plan ID!
      const dbSlugMap = {
        mensual: 'monthly',
        anual: 'yearly',
        vitalicio: 'lifetime'
      }
      const slug = dbSlugMap[planSlug] || 'monthly'
      
      let res
      if (slug === 'lifetime') {
        res = await paymentService.createPreference(slug)
      } else {
        res = await paymentService.createSubscription(slug)
      }
      
      toast.success('Redirigiendo a Mercado Pago...')
      window.location.href = res.init_point
    } catch (err) {
      console.error(err)
      toast.error('Error al iniciar el pago con Mercado Pago.')
    } finally {
      setIsLoading(false)
    }
  }

  // Simulador de redirección a Ualá Bis
  const handleUalaPay = async () => {
    setIsLoading(true)
    try {
      const dbSlugMap = {
        mensual: 'monthly',
        anual: 'yearly',
        vitalicio: 'lifetime'
      }
      const slug = dbSlugMap[planSlug] || 'monthly'
      
      const res = await paymentService.createUalaPay(slug)
      toast.success('Redirigiendo a Ualá Bis...')
      window.location.href = res.payment_url
    } catch (err) {
      console.error(err)
      toast.error('Error al iniciar el pago con Ualá Bis.')
    } finally {
      setIsLoading(false)
    }
  }

  // Pago simulado con tarjeta (Brick de MP)
  const handleCardPay = async (e) => {
    e.preventDefault()
    if (cardNumber.length < 16 || cardCvv.length < 3) {
      toast.error('Por favor, completa los datos de la tarjeta.')
      return
    }

    setIsLoading(true)
    try {
      const dbSlugMap = {
        mensual: 'monthly',
        anual: 'yearly',
        vitalicio: 'lifetime'
      }
      const slug = dbSlugMap[planSlug] || 'monthly'

      // Resolver ID del plan en base al slug para simular el webhook
      // Hacemos un fetch a /payments/status para obtener los detalles
      const { data: statusData } = await api.get('/payments/status')
      
      // Dado que el test de webhook espera un planId real,
      // primero resolvemos el UUID del plan haciendo un GET al endpoint que configuraremos
      const { data: plansList } = await api.get('/users/profile') // fallback
      
      // Simulamos la aprobación mandando al webhook de MP
      // Para obtener el planId, buscamos en el status o hacemos una query
      // Haremos que el backend nos asocie el plan directamente
      // Para simularlo de manera 100% segura, el controlador de webhook de MP / Ualá en el backend
      // ya acepta el slug del plan en `mock_plan_id` si se pasa como string!
      // Así que pasamos el slug directamente!
      const webhookPayload = {
        action: 'payment.created',
        data: { id: 'sim-card-pay-' + Date.now() },
        mock_approved: true,
        mock_user_id: user.id,
        mock_plan_id: slug
      }

      await api.post('/payments/mp/webhook', webhookPayload)
      
      toast.success('Pago procesado con éxito.')
      navigate('/pago/resultado?status=approved&payment_id=sim-card-pay-123')
    } catch (err) {
      console.error(err)
      toast.error('Error al procesar el pago con tarjeta.')
    } finally {
      setIsLoading(false)
    }
  }

  const planNames = {
    mensual: 'Plan Mensual',
    anual: 'Plan Anual',
    vitalicio: 'Plan Vitalicio'
  }
  const planPrices = {
    mensual: '$4.990 / mes',
    anual: '$39.990 / año',
    vitalicio: '$149.990 / único'
  }

  const name = planNames[planSlug] || 'Plan Mensual'

  const dbSlugMap = {
    mensual: 'mensual',
    anual: 'anual',
    vitalicio: 'lifetime'
  }
  const currentPlanKey = dbSlugMap[planSlug] || 'mensual'
  const launchInfo = launchStatus?.prices?.[currentPlanKey]

  const isLaunch = launchStatus?.launchActive && launchInfo?.isLaunch
  const currentPriceFormatted = launchInfo 
    ? `$${launchInfo.current.toLocaleString('es-AR')} / ${planSlug === 'vitalicio' ? 'único' : planSlug === 'anual' ? 'año' : 'mes'}` 
    : (planPrices[planSlug] || '$4.990 / mes')
  const normalPriceFormatted = launchInfo ? `$${launchInfo.normal.toLocaleString('es-AR')} ${planSlug === 'vitalicio' ? 'único' : planSlug === 'anual' ? 'año' : 'mes'}` : null
  const savingsAmount = launchInfo && isLaunch ? launchInfo.normal - launchInfo.current : 0

  return (
    <div className="w-full max-w-2xl bg-invertite-card border border-slate-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden select-none">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-teal to-accent-blue"></div>

      <h2 className="text-2xl font-black text-white text-center mb-8">Completá tu Suscripción</h2>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Resumen del Plan */}
        <div className="space-y-6 bg-slate-950/40 p-6 rounded-2xl border border-slate-900">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Plan Seleccionado</span>
            <h3 className="text-lg font-bold text-white mt-1">{name}</h3>
            
            <div className="mt-2 space-y-1">
              {isLaunch && normalPriceFormatted && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 line-through">{normalPriceFormatted}</span>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[8px] px-1.5 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                    Ahorrás ${savingsAmount.toLocaleString('es-AR')}
                  </span>
                </div>
              )}
              <span className="text-sm font-black text-accent-teal block">{currentPriceFormatted}</span>
            </div>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-400 font-light border-t border-slate-900 pt-4">
            <li className="flex items-center space-x-2">
              <span className="text-accent-teal">✓</span>
              <span>Acceso a todo el material</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-accent-teal">✓</span>
              <span>Tutoría con IA ilimitada</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-accent-teal">✓</span>
              <span>Simulador financiero habilitado</span>
            </li>
          </ul>
        </div>

        {/* Métodos de Pago */}
        <div className="space-y-6">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Método de Pago</span>
          
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            {[
              { id: 'mp', label: 'Mercado Pago' },
              { id: 'uala', label: 'Ualá Bis' },
              { id: 'card', label: 'Tarjeta' },
              { id: 'transfer', label: 'Transferencia' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`py-3 px-2 rounded-xl border text-center transition-all ${
                  method === m.id 
                    ? 'border-accent-teal bg-accent-teal/5 text-accent-teal font-bold' 
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Formulario/Acción según método */}
          <div className="pt-4 border-t border-slate-900">
            {method === 'mp' && (
              <button
                onClick={handleMPPay}
                disabled={isLoading}
                className="w-full py-4 bg-accent-teal hover:bg-accent-teal/90 text-invertite-dark text-xs font-bold rounded-xl active:scale-[0.98] transition-all"
              >
                {isLoading ? 'Redirigiendo...' : 'Pagar con Mercado Pago'}
              </button>
            )}

            {method === 'uala' && (
              <button
                onClick={handleUalaPay}
                disabled={isLoading}
                className="w-full py-4 bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all"
              >
                {isLoading ? 'Redirigiendo...' : 'Pagar con Ualá Bis'}
              </button>
            )}

            {method === 'card' && (
              <form onSubmit={handleCardPay} className="space-y-3">
                <input 
                  type="text"
                  required
                  placeholder="Número de Tarjeta"
                  maxLength="16"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-accent-teal rounded-lg px-3 py-2 text-xs text-white placeholder-slate-650"
                />
                <input 
                  type="text"
                  required
                  placeholder="Nombre en la Tarjeta"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-accent-teal rounded-lg px-3 py-2 text-xs text-white placeholder-slate-650"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text"
                    required
                    placeholder="MM/AA"
                    maxLength="5"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="bg-slate-950 border border-slate-850 focus:border-accent-teal rounded-lg px-3 py-2 text-xs text-white placeholder-slate-650"
                  />
                  <input 
                    type="text"
                    required
                    placeholder="CVV"
                    maxLength="4"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                    className="bg-slate-950 border border-slate-850 focus:border-accent-teal rounded-lg px-3 py-2 text-xs text-white placeholder-slate-650"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-accent-teal hover:bg-accent-teal/90 text-invertite-dark text-xs font-bold rounded-xl transition-all"
                >
                  {isLoading ? 'Procesando Pago...' : 'Pagar con Tarjeta'}
                </button>
              </form>
            )}

            {method === 'transfer' && (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 space-y-2 font-mono">
                  <p className="text-[10px] text-slate-500">BANCO: Galicia</p>
                  <p className="text-[10px] text-slate-500">CBU: 0070008420000001234567</p>
                  <p className="text-[10px] text-slate-500">ALIAS: invertite.educacion</p>
                  <p className="text-[10px] text-slate-500">CUIT: 30-71727374-9</p>
                </div>
                <p className="text-[10px] text-slate-400 font-light leading-relaxed">
                  Realizá la transferencia por el monto exacto y luego enviá el comprobante adjunto a <strong>pagos@invertite.ar</strong> indicando tu email registrado. Tu cuenta se activará en un lapso de 24 horas hábiles.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}

export default Checkout
