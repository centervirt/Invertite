import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import onboardingService from '../../services/onboardingService';
import { useAuth } from '../../context/AuthContext';

const QUESTIONS = [
  {
    key: 'experienceLevel',
    title: '¿Cuál es tu experiencia invirtiendo?',
    options: [
      { value: 'ninguna', label: 'Ninguna — nunca invertí' },
      { value: 'basica', label: 'Básica — alguna vez compré algo pero no entiendo mucho' },
      { value: 'intermedia', label: 'Intermedia — ya invierto pero quiero profundizar' }
    ]
  },
  {
    key: 'primaryGoal',
    title: '¿Cuál es tu objetivo principal hoy?',
    options: [
      { value: 'proteger_inflacion', label: 'Proteger mis ahorros de la inflación' },
      { value: 'ahorrar_dolares', label: 'Ahorrar en dólares de forma legal' },
      { value: 'hacer_crecer_capital', label: 'Hacer crecer mi capital a largo plazo' },
      { value: 'entender_general', label: 'Todavía no sé, quiero entender las opciones' }
    ]
  },
  {
    key: 'riskTolerance',
    title: 'Si tu inversión bajara 15% en un mes, ¿qué harías?',
    options: [
      { value: 'conservador', label: 'Vendería todo, no soporto ver pérdidas' },
      { value: 'moderado', label: 'Esperaría tranquilo, sé que puede recuperarse' },
      { value: 'arriesgado', label: 'Aprovecharía para comprar más a precio bajo' }
    ]
  },
  {
    key: 'timeHorizon',
    title: '¿Para cuándo podrías necesitar este dinero?',
    options: [
      { value: 'corto', label: 'Podría necesitarlo en los próximos meses' },
      { value: 'mediano', label: 'No lo necesito por 1-2 años' },
      { value: 'largo', label: 'Es para el largo plazo, 3+ años' }
    ]
  },
  {
    key: 'monthlyInvestmentRange',
    title: '¿Aproximadamente cuánto podrías destinar a invertir por mes?',
    subtitle: '(esto es solo para personalizar ejemplos, podés omitirlo)',
    options: [
      { value: 'menos_50k', label: 'Menos de $50.000' },
      { value: '50k_200k', label: 'Entre $50.000 y $200.000' },
      { value: '200k_500k', label: 'Entre $200.000 y $500.000' },
      { value: 'mas_500k', label: 'Más de $500.000' },
      { value: 'prefiero_no_decir', label: 'Prefiero no decir' }
    ]
  }
];

export default function InvestorProfile() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // If already completed and has no answers, it might be a direct navigation. 
  // We allow re-taking it if accessed from profile.

  const handleSelect = async (val) => {
    const currentQ = QUESTIONS[step];
    const newAnswers = { ...answers, [currentQ.key]: val };
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      // Submit
      setIsLoading(true);
      try {
        const res = await onboardingService.saveProfile(newAnswers);
        setResult(res);
      } catch (err) {
        console.error('Error saving profile', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleStartTour = () => {
    navigate('/dashboard?startTour=true');
  };

  const handleSkipTour = async () => {
    try {
      await onboardingService.completeOnboarding();
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      navigate('/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-invertite-dark flex items-center justify-center">
        <div className="text-accent-teal animate-pulse">Procesando tu perfil...</div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-invertite-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 text-center">
          <div className="text-4xl">✨</div>
          <h2 className="text-2xl font-black text-white">Tu perfil: {result.recommendation.profileLabel}</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            {result.recommendation.reason}
          </p>
          
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 text-left my-6">
            <p className="text-xs text-accent-teal font-bold uppercase tracking-widest mb-2">Recomendación para empezar:</p>
            <p className="text-white font-semibold">📘 {result.recommendation.moduleTitle}</p>
          </div>

          <div className="space-y-3 pt-4">
            <button 
              onClick={handleStartTour}
              className="w-full bg-accent-teal text-invertite-dark py-3.5 rounded-xl font-bold hover:bg-accent-teal/90 transition-all"
            >
              Empezar ahora →
            </button>
            <button 
              onClick={handleSkipTour}
              className="w-full bg-transparent text-slate-400 py-3.5 rounded-xl font-semibold hover:text-white transition-all text-sm"
            >
              Prefiero ver todo primero →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = QUESTIONS[step];

  return (
    <div className="min-h-screen bg-invertite-dark flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>Paso {step + 1} de {QUESTIONS.length}</span>
            <span>{Math.round(((step + 1) / QUESTIONS.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent-teal transition-all duration-300 ease-out"
              style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div>
            <h2 className="text-2xl font-black text-white">{currentQ.title}</h2>
            {currentQ.subtitle && (
              <p className="text-xs text-slate-400 mt-2">{currentQ.subtitle}</p>
            )}
          </div>

          <div className="space-y-3">
            {currentQ.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className="w-full text-left p-4 rounded-2xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-accent-teal text-slate-200 transition-all active:scale-[0.98] flex items-center space-x-3 group"
              >
                <div className="w-5 h-5 rounded-full border border-slate-600 flex-shrink-0 group-hover:border-accent-teal flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent-teal opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {step > 0 && (
          <button 
            onClick={() => setStep(step - 1)}
            className="text-slate-500 text-sm hover:text-white transition-colors"
          >
            ← Volver al paso anterior
          </button>
        )}

      </div>
    </div>
  );
}
