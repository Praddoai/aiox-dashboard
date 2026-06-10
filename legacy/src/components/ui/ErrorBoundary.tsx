'use client';

import { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

// Icons
const AlertIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const BugIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="8" y="6" width="8" height="14" rx="4" />
    <path d="M19 12h2M3 12h2M19 6l1.5-1.5M5 6L3.5 4.5M19 18l1.5 1.5M5 18L3.5 19.5" />
    <line x1="12" y1="6" x2="12" y2="2" />
  </svg>
);

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state if resetKeys change
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys &&
      !this.areKeysEqual(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.reset();
    }
  }

  areKeysEqual(a: unknown[], b: unknown[]): boolean {
    return a.length === b.length && a.every((key, i) => key === b[i]);
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onReset: () => void;
}

function ErrorFallback({ error, errorInfo, onReset }: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === 'development';

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReport = () => {
    const subject = encodeURIComponent(`Bug Report: ${error?.message || 'Unknown error'}`);
    const body = encodeURIComponent(
      `Error: ${error?.message}\n\nStack: ${error?.stack}\n\nComponent Stack: ${errorInfo?.componentStack}`
    );
    window.open(`mailto:support@aios.dev?subject=${subject}&body=${body}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[400px] flex items-center justify-center p-6"
    >
      <div className="text-center max-w-md">
        {/* Error icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mx-auto w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6"
        >
          <AlertIcon />
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-semibold text-foreground mb-2"
        >
          Algo deu errado
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground mb-6"
        >
          Ocorreu um erro inesperado. Tente recarregar a página ou voltar ao início.
        </motion.p>

        {/* Error details (dev only) */}
        {isDev && error && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-6 p-4 rounded-xl glass-subtle text-left overflow-auto max-h-[200px]"
          >
            <p className="text-xs font-mono text-red-400 mb-2">{error.message}</p>
            {error.stack && (
              <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
                {error.stack.split('\n').slice(1, 6).join('\n')}
              </pre>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          <Button
            variant="default"
            size="sm"
            onClick={onReset}
          >
            <RefreshIcon />
            Tentar novamente
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReload}
          >
            <RefreshIcon />
            Recarregar página
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoHome}
          >
            <HomeIcon />
            Ir ao início
          </Button>
        </motion.div>

        {/* Report bug link */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={handleReport}
          className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mx-auto"
        >
          <BugIcon />
          <span>Reportar problema</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

// Compact error fallback for smaller sections
interface CompactErrorFallbackProps {
  message?: string;
  onRetry?: () => void;
}

export function CompactErrorFallback({ message = 'Erro ao carregar', onRetry }: CompactErrorFallbackProps) {
  return (
    <div className="p-4 rounded-xl glass-subtle text-center">
      <div className="text-red-500 mb-2">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

// Hook for error handling in functional components
export function useErrorHandler() {
  const handleError = (error: Error) => {
    // In production, you might want to send this to an error tracking service
    console.error('Error caught by useErrorHandler:', error);

    // Re-throw to be caught by ErrorBoundary
    throw error;
  };

  return { handleError };
}

// Async error boundary wrapper for Suspense
interface AsyncBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export function AsyncBoundary({ children, fallback }: AsyncBoundaryProps) {
  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}
