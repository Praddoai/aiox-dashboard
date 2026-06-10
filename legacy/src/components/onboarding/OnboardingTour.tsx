'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type LucideIcon,
  Hand,
  Users,
  Bot,
  MessageSquare,
  Star,
  Search,
  Keyboard,
  Rocket,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Tour steps
interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  position?: 'center' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao AIOS Core',
    description: 'Uma plataforma de IA multi-agente para potencializar seu trabalho. Vamos fazer um tour rapido pelas principais funcionalidades.',
    icon: Hand,
    position: 'center',
  },
  {
    id: 'squads',
    title: 'Squads de Especialistas',
    description: 'Na sidebar esquerda voce encontra os Squads - equipes de agentes especializados em diferentes areas como Copywriting, Design, YouTube e mais.',
    icon: Users,
    position: 'left',
  },
  {
    id: 'agents',
    title: 'Agentes Inteligentes',
    description: 'Cada squad possui agentes com habilidades unicas. Selecione um agente para iniciar uma conversa e aproveitar sua expertise.',
    icon: Bot,
    position: 'left',
  },
  {
    id: 'chat',
    title: 'Chat Interativo',
    description: 'Converse naturalmente com os agentes. Eles entendem contexto, respondem em tempo real e podem executar comandos especificos.',
    icon: MessageSquare,
    position: 'center',
  },
  {
    id: 'favorites',
    title: 'Favoritos e Recentes',
    description: 'Marque seus agentes favoritos com a estrela para acesso rapido. Agentes usados recentemente tambem ficam salvos.',
    icon: Star,
    position: 'left',
  },
  {
    id: 'search',
    title: 'Busca Global',
    description: 'Pressione Cmd+K para abrir a busca global e encontrar rapidamente qualquer agente em qualquer squad.',
    icon: Search,
    position: 'center',
  },
  {
    id: 'shortcuts',
    title: 'Atalhos de Teclado',
    description: 'Pressione Cmd+? para ver todos os atalhos disponiveis. Navegue mais rapido com o teclado.',
    icon: Keyboard,
    position: 'center',
  },
  {
    id: 'ready',
    title: 'Pronto para Comecar!',
    description: 'Voce esta pronto para explorar o AIOS Core. Selecione um squad e comece uma conversa com um agente.',
    icon: Rocket,
    position: 'center',
  },
];

// Onboarding store
interface OnboardingState {
  hasCompletedTour: boolean;
  setHasCompletedTour: (completed: boolean) => void;
  resetTour: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedTour: false,
      setHasCompletedTour: (completed) => set({ hasCompletedTour: completed }),
      resetTour: () => set({ hasCompletedTour: false }),
    }),
    {
      name: 'aios-onboarding',
    }
  )
);

interface OnboardingTourProps {
  onComplete?: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const { hasCompletedTour, setHasCompletedTour } = useOnboardingStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Show tour if not completed
  useEffect(() => {
    if (!hasCompletedTour) {
      // Small delay to let the app render first
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    setHasCompletedTour(true);
    onComplete?.();
  };

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200]"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-scrim-40 backdrop-blur-[2px]" />

        {/* Tour Card */}
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-full max-w-md p-1',
            step.position === 'left' && 'left-8 md:left-[320px]',
            step.position === 'right' && 'right-8',
            step.position === 'center' && 'left-1/2 -translate-x-1/2'
          )}
        >
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Icon */}
              <div className="mb-4">
                <step.icon size={48} className="text-blue-400" />
              </div>

              {/* Text */}
              <h2 className="text-xl font-bold text-foreground mb-2">{step.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>

              {/* Step indicator */}
              <div className="flex items-center gap-1.5 mt-6 mb-4">
                {tourSteps.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      index === currentStep
                        ? 'w-6 bg-blue-500'
                        : index < currentStep
                        ? 'w-1.5 bg-blue-500/50'
                        : 'w-1.5 bg-muted'
                    )}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <Button variant="ghost" size="sm" onClick={handlePrev}>
                      Voltar
                    </Button>
                  )}
                  <button
                    onClick={handleSkip}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Pular tour
                  </button>
                </div>

                <Button
                  size="sm"
                  onClick={handleNext}
                >
                  {isLastStep ? (
                    <>
                      Comecar
                      <Check className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      Proximo
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Skip button (top right) */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to manually trigger tour
export function useOnboardingTour() {
  const { hasCompletedTour, setHasCompletedTour, resetTour } = useOnboardingStore();

  return {
    hasCompletedTour,
    startTour: () => setHasCompletedTour(false),
    completeTour: () => setHasCompletedTour(true),
    resetTour,
  };
}
