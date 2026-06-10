import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation, useFieldValidation, validationRules } from '../useFormValidation';

describe('validationRules', () => {
  describe('required', () => {
    it('should fail for empty string', () => {
      const rule = validationRules.required();
      expect(rule.validate('')).toBe(false);
    });

    it('should pass for non-empty string', () => {
      const rule = validationRules.required();
      expect(rule.validate('hello')).toBe(true);
    });

    it('should fail for whitespace only', () => {
      const rule = validationRules.required();
      expect(rule.validate('   ')).toBe(false);
    });
  });

  describe('minLength', () => {
    it('should pass for string >= min length', () => {
      const rule = validationRules.minLength(3);
      expect(rule.validate('abc')).toBe(true);
      expect(rule.validate('abcd')).toBe(true);
    });

    it('should fail for string < min length', () => {
      const rule = validationRules.minLength(3);
      expect(rule.validate('ab')).toBe(false);
    });

    it('should pass for empty string (optional field)', () => {
      const rule = validationRules.minLength(3);
      expect(rule.validate('')).toBe(true);
    });
  });

  describe('maxLength', () => {
    it('should pass for string <= max length', () => {
      const rule = validationRules.maxLength(5);
      expect(rule.validate('abc')).toBe(true);
      expect(rule.validate('abcde')).toBe(true);
    });

    it('should fail for string > max length', () => {
      const rule = validationRules.maxLength(5);
      expect(rule.validate('abcdef')).toBe(false);
    });
  });

  describe('email', () => {
    it('should pass for valid email', () => {
      const rule = validationRules.email();
      expect(rule.validate('test@example.com')).toBe(true);
      expect(rule.validate('user.name@domain.co')).toBe(true);
    });

    it('should fail for invalid email', () => {
      const rule = validationRules.email();
      expect(rule.validate('invalid')).toBe(false);
      expect(rule.validate('test@')).toBe(false);
      expect(rule.validate('@example.com')).toBe(false);
    });

    it('should pass for empty string (optional field)', () => {
      const rule = validationRules.email();
      expect(rule.validate('')).toBe(true);
    });
  });

  describe('url', () => {
    it('should pass for valid URL', () => {
      const rule = validationRules.url();
      expect(rule.validate('https://example.com')).toBe(true);
      expect(rule.validate('http://localhost:3000')).toBe(true);
    });

    it('should fail for invalid URL', () => {
      const rule = validationRules.url();
      expect(rule.validate('not-a-url')).toBe(false);
    });
  });

  describe('pattern', () => {
    it('should pass for matching pattern', () => {
      const rule = validationRules.pattern(/^[A-Z]{3}$/);
      expect(rule.validate('ABC')).toBe(true);
    });

    it('should fail for non-matching pattern', () => {
      const rule = validationRules.pattern(/^[A-Z]{3}$/);
      expect(rule.validate('abc')).toBe(false);
      expect(rule.validate('ABCD')).toBe(false);
    });
  });

  describe('numeric', () => {
    it('should pass for numeric string', () => {
      const rule = validationRules.numeric();
      expect(rule.validate('123')).toBe(true);
    });

    it('should fail for non-numeric string', () => {
      const rule = validationRules.numeric();
      expect(rule.validate('12a')).toBe(false);
    });
  });
});

describe('useFieldValidation', () => {
  it('should initialize with the given value', () => {
    const { result } = renderHook(() =>
      useFieldValidation('initial', [validationRules.required()])
    );

    expect(result.current.value).toBe('initial');
    expect(result.current.error).toBeNull();
    expect(result.current.touched).toBe(false);
  });

  it('should update value on setValue', () => {
    const { result } = renderHook(() =>
      useFieldValidation<string>('', [validationRules.required()])
    );

    act(() => {
      result.current.setValue('new value');
    });

    expect(result.current.value).toBe('new value');
  });

  it('should show error after blur', () => {
    const { result } = renderHook(() =>
      useFieldValidation('', [validationRules.required('Campo obrigatório')])
    );

    act(() => {
      result.current.onBlur();
    });

    expect(result.current.touched).toBe(true);
    expect(result.current.error).toBe('Campo obrigatório');
  });

  it('should validate on demand', () => {
    const { result } = renderHook(() =>
      useFieldValidation('', [validationRules.required()])
    );

    let isValid: boolean;
    act(() => {
      isValid = result.current.validate();
    });

    expect(isValid!).toBe(false);
    expect(result.current.touched).toBe(true);
  });

  it('should reset to initial state', () => {
    const { result } = renderHook(() =>
      useFieldValidation<string>('initial', [validationRules.required()])
    );

    act(() => {
      result.current.setValue('changed');
      result.current.onBlur();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.value).toBe('initial');
    expect(result.current.error).toBeNull();
    expect(result.current.touched).toBe(false);
  });

  it('should track dirty state', () => {
    const { result } = renderHook(() =>
      useFieldValidation('initial', [])
    );

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.setValue('changed');
    });

    expect(result.current.isDirty).toBe(true);
  });
});

describe('useFormValidation', () => {
  const initialValues = {
    name: '',
    email: '',
  };

  const validationSchema = {
    name: [validationRules.required('Nome obrigatório')],
    email: [
      validationRules.required('Email obrigatório'),
      validationRules.email('Email inválido'),
    ],
  };

  it('should initialize with the given values', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationSchema)
    );

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });

  it('should update a single value', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationSchema)
    );

    act(() => {
      result.current.setValue('name', 'John');
    });

    expect(result.current.values.name).toBe('John');
  });

  it('should validate all fields', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationSchema)
    );

    let isValid: boolean;
    act(() => {
      isValid = result.current.validateAll();
    });

    expect(isValid!).toBe(false);
    expect(result.current.errors.name).toBe('Nome obrigatório');
    expect(result.current.errors.email).toBe('Email obrigatório');
  });

  it('should pass validation with valid data', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationSchema)
    );

    act(() => {
      result.current.setValue('name', 'John');
      result.current.setValue('email', 'john@example.com');
    });

    let isValid: boolean;
    act(() => {
      isValid = result.current.validateAll();
    });

    expect(isValid!).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it('should reset form to initial values', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationSchema)
    );

    act(() => {
      result.current.setValue('name', 'John');
      result.current.setValue('email', 'john@example.com');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });

  it('should track dirty state', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationSchema)
    );

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.setValue('name', 'John');
    });

    expect(result.current.isDirty).toBe(true);
  });

  it('should provide getFieldProps helper', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationSchema)
    );

    const fieldProps = result.current.getFieldProps('name');

    expect(fieldProps.name).toBe('name');
    expect(fieldProps.value).toBe('');
    expect(typeof fieldProps.onChange).toBe('function');
    expect(typeof fieldProps.onBlur).toBe('function');
  });
});
