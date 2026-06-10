import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

// Error icon
const ErrorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// Success icon
const SuccessIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showCharacterCount?: boolean;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, label, error, success, hint, leftIcon, rightIcon, showCharacterCount, maxLength, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [charCount, setCharCount] = useState((props.value as string)?.length || (props.defaultValue as string)?.length || 0);
    const inputId = useId();
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCharCount(e.target.value.length);
      props.onChange?.(e);
    };

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-secondary">
            {label}
            {props.required && <span className="text-[var(--input-required-text)] ml-0.5">*</span>}
          </label>
        )}
        <div
          className={cn(
            'relative flex items-center rounded-xl transition-all duration-150',
            isFocused && !error && 'ring-2 ring-[var(--input-focus-ring)]',
            error && 'ring-2 ring-[var(--input-error-ring)]',
            success && !error && 'ring-2 ring-[var(--input-success-ring)]'
          )}
        >
          {leftIcon && (
            <span className="absolute left-3 text-tertiary pointer-events-none" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'glass-input w-full h-11 px-4 rounded-xl',
              leftIcon && 'pl-10',
              (rightIcon || error || success) && 'pr-10',
              error && 'border-[var(--input-error-border)] focus:border-[var(--input-error-border-focus)]',
              success && !error && 'border-[var(--input-success-border)] focus:border-[var(--input-success-border-focus)]',
              className
            )}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            onChange={handleChange}
            maxLength={maxLength}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={cn(
              error && errorId,
              hint && !error && hintId
            ) || undefined}
            {...props}
          />

          {/* Status icons */}
          <span className="absolute right-3 flex items-center gap-1">
            {error && (
              <span className="text-[var(--input-error-text)]" aria-hidden="true">
                <ErrorIcon />
              </span>
            )}
            {success && !error && (
              <span className="text-[var(--input-success-text)]" aria-hidden="true">
                <SuccessIcon />
              </span>
            )}
            {rightIcon && !error && !success && (
              <span className="text-tertiary" aria-hidden="true">
                {rightIcon}
              </span>
            )}
          </span>
        </div>

        {/* Error message with animation */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.span
              id={errorId}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-[var(--input-error-text)] flex items-center gap-1"
              role="alert"
            >
              {error}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Hint text (shown when no error) */}
        {hint && !error && (
          <span id={hintId} className="text-xs text-tertiary">
            {hint}
          </span>
        )}

        {/* Character count */}
        {showCharacterCount && maxLength && (
          <span className={cn(
            'text-xs text-right',
            charCount >= maxLength ? 'text-[var(--input-error-text)]' : 'text-tertiary'
          )}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

export interface GlassTextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  showCharacterCount?: boolean;
}

export const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ className, label, error, success, hint, showCharacterCount, maxLength, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [charCount, setCharCount] = useState((props.value as string)?.length || (props.defaultValue as string)?.length || 0);
    const textareaId = useId();
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      props.onChange?.(e);
    };

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-secondary">
            {label}
            {props.required && <span className="text-[var(--input-required-text)] ml-0.5">*</span>}
          </label>
        )}
        <div
          className={cn(
            'relative rounded-xl transition-all duration-150',
            isFocused && !error && 'ring-2 ring-[var(--input-focus-ring)]',
            error && 'ring-2 ring-[var(--input-error-ring)]',
            success && !error && 'ring-2 ring-[var(--input-success-ring)]'
          )}
        >
          <textarea
            ref={ref}
            id={textareaId}
            className={cn(
              'glass-input w-full min-h-[100px] px-4 py-3 rounded-xl resize-none',
              'glass-scrollbar',
              error && 'border-[var(--input-error-border)] focus:border-[var(--input-error-border-focus)]',
              success && !error && 'border-[var(--input-success-border)] focus:border-[var(--input-success-border-focus)]',
              className
            )}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            onChange={handleChange}
            maxLength={maxLength}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={cn(
              error && errorId,
              hint && !error && hintId
            ) || undefined}
            {...props}
          />
        </div>

        {/* Error message with animation */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.span
              id={errorId}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-[var(--input-error-text)] flex items-center gap-1"
              role="alert"
            >
              {error}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Hint and character count row */}
        <div className="flex items-center justify-between">
          {hint && !error && (
            <span id={hintId} className="text-xs text-tertiary">
              {hint}
            </span>
          )}
          {!hint && !error && <span />}

          {showCharacterCount && maxLength && (
            <span className={cn(
              'text-xs',
              charCount >= maxLength ? 'text-[var(--input-error-text)]' : 'text-tertiary'
            )}>
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

GlassTextarea.displayName = 'GlassTextarea';
