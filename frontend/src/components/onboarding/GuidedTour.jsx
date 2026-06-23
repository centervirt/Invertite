import React, { useState, useEffect } from 'react';
import onboardingService from '../../services/onboardingService';

const TOUR_STEPS = [
  {
    key: 'dashboard',
    selector: '#tour-dashboard-progress',
    text: 'Acá vas a ver tu progreso general, tu racha de días y tu módulo actual. Es tu punto de partida cada vez que entrás.'
  },
  {
    key: 'modules',
    selector: 'a[href="/modulos"]',
    text: 'Acá están los 10 módulos. Empezá por el que te recomendamos, pero podés explorar libremente cuando quieras.'
  },
  {
    key: 'tutor',
    selector: 'a[href="/tutor"]',
    text: 'Tu asesor financiero personal, disponible 24/7. Preguntale lo que quieras, con datos reales del mercado argentino de hoy.'
  },
  {
    key: 'simulator',
    selector: 'a[href="/simulador"]',
    text: 'Practicá con $1.000.000 de pesos ficticios y precios reales del mercado. Sin arriesgar un peso real mientras aprendés.'
  },
  {
    key: 'alerts',
    selector: '#tour-alerts-bell',
    text: 'Acá vas a recibir avisos cuando algo importante pasa en el mercado — como una suba fuerte del dólar o un cambio de tasas.'
  }
];

export default function GuidedTour({ onComplete }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const step = TOUR_STEPS[currentStepIndex];

  const updateTargetRect = () => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    } else {
      setTargetRect(null);
    }
  };

  useEffect(() => {
    // Retry finding element since it might render slightly later
    const interval = setInterval(updateTargetRect, 200);
    window.addEventListener('resize', updateTargetRect);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [step]);

  const handleNext = async () => {
    try {
      if (step) {
        await onboardingService.recordTourStep(step.key);
      }
      
      if (currentStepIndex < TOUR_STEPS.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
      } else {
        await onboardingService.completeOnboarding();
        if (onComplete) onComplete();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSkip = async () => {
    try {
      await onboardingService.completeOnboarding();
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
    }
  };

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Overlay Oscuro Base */}
      <div className="absolute inset-0 bg-black/70 pointer-events-auto"></div>
      
      {/* Spotlight Agujero (Cutout usando mix-blend-mode o boxShadow invertido) */}
      {targetRect && (
        <div 
          className="absolute bg-transparent transition-all duration-300 ease-out shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] rounded-xl pointer-events-none z-50"
          style={{
            top: targetRect.top - 10,
            left: targetRect.left - 10,
            width: targetRect.width + 20,
            height: targetRect.height + 20,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.75), 0 0 15px 2px rgba(0,201,167,0.5)',
            border: '2px solid rgba(0,201,167,0.8)'
          }}
        ></div>
      )}

      {/* Botón Saltar general */}
      <div className="absolute top-4 right-4 z-50 pointer-events-auto">
        <button 
          onClick={handleSkip}
          className="text-xs font-bold text-slate-400 hover:text-white bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700"
        >
          Saltar tour ✕
        </button>
      </div>

      {/* Tooltip Content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
        <div 
          className="bg-slate-900 border border-accent-teal rounded-2xl p-6 shadow-2xl max-w-sm pointer-events-auto relative mx-4 mt-[30vh] sm:mt-[20vh] transition-all"
        >
          {/* Arrow / Tip pointing conceptually. We can just center it for simplicity, or position relative to target */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-accent-teal uppercase tracking-widest">
              Paso {currentStepIndex + 1} de {TOUR_STEPS.length}
            </span>
          </div>
          
          <p className="text-sm text-white font-medium mb-6">
            {step.text}
          </p>

          <button 
            onClick={handleNext}
            className="w-full bg-accent-teal text-invertite-dark font-bold py-3 rounded-xl hover:bg-accent-teal/90 transition-all active:scale-[0.98]"
          >
            {currentStepIndex === TOUR_STEPS.length - 1 ? 'Finalizar tour ✓' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  );
}
