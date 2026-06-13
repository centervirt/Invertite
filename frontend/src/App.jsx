import { Routes, Route } from 'react-router-dom'

// Pages (se irán creando en etapas siguientes)
const HomePage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
    <div className="animate-fade-in">
      {/* Logo */}
      <div className="mb-8">
        <span className="text-5xl font-bold">
          <span className="gradient-text">Invertite</span>
        </span>
        <div className="mt-2 badge-green mx-auto w-fit">
          🇦🇷 Educación Financiera Argentina
        </div>
      </div>

      {/* Status */}
      <div className="card p-8 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">
          ¡Plataforma en construcción! 🚀
        </h1>
        <p className="text-gray-400 mb-6">
          Estamos construyendo la mejor plataforma de educación financiera para inversores argentinos.
        </p>
        <div className="space-y-3 text-left">
          {[
            { label: 'Backend API', status: '✅ Inicializado', ok: true },
            { label: 'Frontend React', status: '✅ Inicializado', ok: true },
            { label: 'Autenticación', status: '⏳ Etapa 2', ok: false },
            { label: 'Cursos y Lecciones', status: '⏳ Etapa 3', ok: false },
            { label: 'Simulador IA', status: '⏳ Etapa 3', ok: false },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center py-2 border-b border-dark-500/30">
              <span className="text-gray-300 text-sm">{item.label}</span>
              <span className={`text-sm font-medium ${item.ok ? 'text-primary-400' : 'text-gray-500'}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* API health */}
      <p className="mt-6 text-xs text-gray-600">
        API → <code className="text-primary-500">http://localhost:3001/api/health</code>
      </p>
    </div>
  </div>
)

function App() {
  return (
    <div className="min-h-screen bg-dark-900">
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* Las rutas se agregarán en etapas siguientes */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-6xl font-bold gradient-text mb-4">404</h2>
              <p className="text-gray-400">Página no encontrada</p>
            </div>
          </div>
        } />
      </Routes>
    </div>
  )
}

export default App
