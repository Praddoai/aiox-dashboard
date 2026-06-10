'use client';

import { useState, useCallback, useMemo } from 'react';

// Validation rule types
export type ValidationRule<T = string> = {
  validate: (value: T, formValues?: Record<string, unknown>) => boolean;
  message: string;
};

export type FieldValidation<T = string> = ValidationRule<T>[];

export interface FieldState<T = string> {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
}

export interface FormState<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

// Common validation rules
export const validationRules = {
  required: (message = 'Este campo é obrigatório'): ValidationRule => ({
    validate: (value) => value !== undefined && value !== null && value.trim() !== '',
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => !value || value.length >= min,
    message: message || `Mínimo de ${min} caracteres`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => !value || value.length <= max,
    message: message || `Máximo de ${max} caracteres`,
  }),

  email: (message = 'Email inválido'): ValidationRule => ({
    validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message,
  }),

  url: (message = 'URL inválida'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  pattern: (regex: RegExp, message = 'Formato inválido'): ValidationRule => ({
    validate: (value) => !value || regex.test(value),
    message,
  }),

  numeric: (message = 'Deve conter apenas números'): ValidationRule => ({
    validate: (value) => !value || /^\d+$/.test(value),
    message,
  }),

  alphanumeric: (message = 'Deve conter apenas letras e números'): ValidationRule => ({
    validate: (value) => !value || /^[a-zA-Z0-9]+$/.test(value),
    message,
  }),

  match: (fieldName: string, message?: string): ValidationRule => ({
    validate: (value, formValues) => {
      if (!formValues) return true;
      return value === formValues[fieldName];
    },
    message: message || `Deve ser igual a ${fieldName}`,
  }),

  custom: <T = string>(
    validateFn: (value: T, formValues?: Record<string, unknown>) => boolean,
    message: string
  ): ValidationRule<T> => ({
    validate: validateFn,
    message,
  }),
};

// Main form validation hook
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validationSchema: Partial<Record<keyof T, FieldValidation>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form has been modified
  const isDirty = useMemo(() => {
    return Object.keys(values).some(
      (key) => values[key as keyof T] !== initialValues[key as keyof T]
    );
  }, [values, initialValues]);

  // Validate a single field
  const validateField = useCallback(
    (name: keyof T, value: unknown): string | null => {
      const rules = validationSchema[name];
      if (!rules) return null;

      for (const rule of rules) {
        if (!rule.validate(value as string, values as Record<string, unknown>)) {
          return rule.message;
        }
      }
      return null;
    },
    [validationSchema, values]
  );

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const key of Object.keys(validationSchema) as Array<keyof T>) {
      const error = validateField(key, values[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [validationSchema, values, validateField]);

  // Handle field change
  const handleChange = useCallback(
    (name: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setValues((prev) => ({ ...prev, [name]: value }));

      // Clear error on change if field was touched
      if (touched[name]) {
        const error = validateField(name, value);
        setErrors((prev) => ({ ...prev, [name]: error || undefined }));
      }
    },
    [touched, validateField]
  );

  // Handle field blur
  const handleBlur = useCallback(
    (name: keyof T) => () => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const error = validateField(name, values[name]);
      setErrors((prev) => ({ ...prev, [name]: error || undefined }));
    },
    [values, validateField]
  );

  // Set a single value programmatically
  const setValue = useCallback((name: keyof T, value: T[keyof T]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Set multiple values
  const setMultipleValues = useCallback((newValues: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...newValues }));
  }, []);

  // Set a single error programmatically
  const setError = useCallback((name: keyof T, error: string | null) => {
    setErrors((prev) => ({ ...prev, [name]: error || undefined }));
  }, []);

  // Reset form to initial values
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Handle form submission
  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) => async (e: React.FormEvent) => {
      e.preventDefault();

      // Touch all fields
      const allTouched = Object.keys(validationSchema).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Record<keyof T, boolean>
      );
      setTouched(allTouched);

      // Validate
      if (!validateAll()) {
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validationSchema, validateAll]
  );

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).every((key) => !errors[key as keyof T]);
  }, [errors]);

  // Get field props helper
  const getFieldProps = useCallback(
    (name: keyof T) => ({
      name: name as string,
      value: values[name] as string,
      onChange: handleChange(name),
      onBlur: handleBlur(name),
      error: touched[name] ? errors[name] : undefined,
      'aria-invalid': touched[name] && !!errors[name],
      'aria-describedby': errors[name] ? `${String(name)}-error` : undefined,
    }),
    [values, errors, touched, handleChange, handleBlur]
  );

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    setMultipleValues,
    setError,
    validateField,
    validateAll,
    reset,
    getFieldProps,
  };
}

// Simple field-level validation hook
export function useFieldValidation<T = string>(
  initialValue: T,
  rules: ValidationRule<T>[]
) {
  const [value, setValue] = useState<T>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validate = useCallback(
    (val: T): string | null => {
      for (const rule of rules) {
        if (!rule.validate(val)) {
          return rule.message;
        }
      }
      return null;
    },
    [rules]
  );

  const handleChange = useCallback(
    (newValue: T) => {
      setValue(newValue);
      if (touched) {
        setError(validate(newValue));
      }
    },
    [touched, validate]
  );

  const handleBlur = useCallback(() => {
    setTouched(true);
    setError(validate(value));
  }, [value, validate]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setTouched(false);
  }, [initialValue]);

  return {
    value,
    error: touched ? error : null,
    touched,
    isDirty: value !== initialValue,
    isValid: !error,
    setValue: handleChange,
    setTouched,
    onBlur: handleBlur,
    validate: () => {
      setTouched(true);
      const err = validate(value);
      setError(err);
      return !err;
    },
    reset,
  };
}
