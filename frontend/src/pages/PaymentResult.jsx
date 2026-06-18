import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PaymentResult = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  
  const status = searchParams.get('status') || 'pending'
  const paymentId = searchParams.get('payment_id') || 'N/D'

  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Si es aprobado, refrescamos el estado del usuario para desbloquear las rutas protegidas
    if (status === 'approved') {
      refreshUser()
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            navigate('/dashboard', { replace: true })
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [status, navigate, refreshUser])

  return (
    <div className="bg-invertite-dark text-slate-100 min-h-screen flex items-center justify-center px-4 font-sans select-none selection:bg-accent-teal selection:text-invertite-dark">
      <div className="w-full max-w-md bg-invertite-card border border-slate-900 rounded-3xl p-8 relative overflow-hidden shadow-2xl text-center space-y-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-teal to-accent-blue"></div>

        {status === 'approved' && (
          <>
            <div className="text-5xl animate-bounce">🎉</div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">¡Pago Aprobado!</h2>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Tu suscripción ya está activa. Gracias por confiar en Invertite para dar tus primeros pasos financieros.
              </p>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-2xl text-[10px] text-slate-500 font-mono">
              COMPROBANTE ID: {paymentId}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-accent-teal font-semibold">
                Redirigiendo a tu Dashboard en {countdown} segundos...
              </p>
              <Link to="/dashboard" className="text-xs text-slate-400 underline hover:text-white font-bold block pt-2">
                Ir ahora mismo
              </Link>
            </div>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="text-5xl animate-pulse">⏳</div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Pago en Procesamiento</h2>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Estamos esperando la confirmación de la pasarela de pagos. Esto suele tardar unos minutos. Te enviaremos un correo al finalizar.
              </p>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-2xl text-[10px] text-slate-500 font-mono">
              REFERENCIA ID: {paymentId}
            </div>
            <Link 
              to="/dashboard" 
              className="w-full block py-3 bg-accent-teal hover:bg-accent-teal/90 text-invertite-dark text-xs font-bold rounded-xl active:scale-[0.98] transition-all"
            >
              Ir al Dashboard
            </Link>
          </>
        )}

        {status === 'failure' && (
          <>
            <div className="text-5xl">⚠️</div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">El pago ha fallado</h2>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Hubo un inconveniente al procesar tu tarjeta o transacción. No se realizó ningún cargo en tu cuenta.
              </p>
            </div>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <Link 
                to="/pagar/mensual" 
                className="w-full py-3.5 bg-accent-teal hover:bg-accent-teal/90 text-invertite-dark text-xs font-bold rounded-xl active:scale-[0.98] text-center transition-all"
              >
                Volver a Intentar
              </Link>
              <Link 
                to="/" 
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold rounded-xl text-center transition-all"
              >
                Volver al Inicio
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

export default PaymentResult
