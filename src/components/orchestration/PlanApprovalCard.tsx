/**
 * PlanApprovalCard — Shows the execution plan for user approval.
 * Displays plan summary, reasoning, steps with agent/squad info,
 * and approve/revise buttons.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  MessageSquareText,
  Clock,
  Users,
  ArrowRight,
  Sparkles,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';
import { getSquadInlineStyle } from '../../lib/theme';
import type { ExecutionPlan } from './orchestration-types';

interface PlanApprovalCardProps {
  plan: ExecutionPlan;
  demand: string;
  onApprove: () => void;
  onRevise: (feedback: string) => void;
  isSubmitting?: boolean;
}

export function PlanApprovalCard({ plan, onApprove, onRevise, isSubmitting }: PlanApprovalCardProps) {
  const [showReviseInput, setShowReviseInput] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showReasoning, setShowReasoning] = useState(false);

  const handleRevise = () => {
    if (feedback.trim()) {
      onRevise(feedback.trim());
      setFeedback('');
      setShowReviseInput(false);
    }
  };

  // Unique squads in the plan
  const uniqueSquads = [...new Set(plan.steps.map(s => s.squadId))];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-yellow-500/30 bg-gradient-to-b from-yellow-500/5 to-transparent overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-yellow-500/20 bg-yellow-500/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Plano de Execução</h3>
            <p className="text-sm text-white/50">Revise o plano antes de iniciar a execução</p>
          </div>
          {plan.estimatedDuration && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <Clock className="w-3.5 h-3.5 text-white/50" />
              <span className="text-xs text-white/60">{plan.estimatedDuration}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 space-y-3">
        <p className="text-sm text-white/80">{plan.summary}</p>

        {/* Reasoning toggle */}
        {plan.reasoning && (
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            {showReasoning ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Raciocínio do orquestrador
          </button>
        )}
        {showReasoning && plan.reasoning && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-xs text-white/40 italic pl-4 border-l-2 border-white/10"
          >
            {plan.reasoning}
          </motion.p>
        )}

        {/* Squad summary */}
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-3.5 h-3.5 text-white/40" />
          <span className="text-xs text-white/40">Squads:</span>
          {uniqueSquads.map(squadId => (
            <span
              key={squadId}
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                ...getSquadInlineStyle(squadId),
                opacity: 0.9,
              }}
            >
              {plan.steps.find(s => s.squadId === squadId)?.squadName || squadId}
            </span>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="px-6 pb-4">
        <div className="space-y-2">
          {plan.steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors group"
            >
              {/* Step number */}
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-white/70">{index + 1}</span>
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded"
                    style={getSquadInlineStyle(step.squadId)}
                  >
                    {step.agentName}
                  </span>
                  <span className="text-[10px] text-white/30">{step.squadName}</span>
                  {step.estimatedDuration && (
                    <span className="text-[10px] text-white/30 ml-auto flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {step.estimatedDuration}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{step.task}</p>
                {step.dependsOn.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowRight className="w-3 h-3 text-white/20" />
                    <span className="text-[10px] text-white/30">
                      Depende de: {step.dependsOn.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-white/10 space-y-3">
        {/* Revise input */}
        {showReviseInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2"
          >
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Descreva os ajustes que deseja no plano..."
              className="w-full h-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleRevise();
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => { setShowReviseInput(false); setFeedback(''); }}
                disabled={isSubmitting}
              >
                Cancelar
              </GlassButton>
              <GlassButton
                size="sm"
                onClick={handleRevise}
                disabled={!feedback.trim() || isSubmitting}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Enviar Ajustes
              </GlassButton>
            </div>
          </motion.div>
        )}

        {/* Main action buttons */}
        {!showReviseInput && (
          <div className="flex gap-3">
            <GlassButton
              variant="ghost"
              className="flex-1 py-2.5"
              onClick={() => setShowReviseInput(true)}
              disabled={isSubmitting}
            >
              <MessageSquareText className="w-4 h-4 mr-2" />
              Solicitar Ajustes
            </GlassButton>
            <GlassButton
              className="flex-1 py-2.5 bg-green-500/15 border-green-500/30 hover:bg-green-500/25"
              onClick={onApprove}
              disabled={isSubmitting}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Iniciando...' : 'Aprovar e Executar'}
            </GlassButton>
          </div>
        )}
      </div>
    </motion.div>
  );
}
