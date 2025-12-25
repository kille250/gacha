/**
 * useFormValidation - Real-time form validation hook
 *
 * Provides declarative form validation with immediate feedback.
 * Supports async validation, debouncing, and accessibility features.
 *
 * @features
 * - Real-time validation as user types
 * - Debounced validation for expensive checks
 * - Async validation (e.g., checking username availability)
 * - Field-level error messages
 * - Touch tracking (only show errors after field is touched)
 * - Submit validation (validates all fields)
 * - ARIA attributes for accessibility
 *
 * @example
 * const {
 *   values,
 *   errors,
 *   touched,
 *   isValid,
 *   isSubmitting,
 *   handleChange,
 *   handleBlur,
 *   handleSubmit,
 *   getFieldProps,
 *   getErrorProps,
 * } = useFormValidation({
 *   initialValues: { email: '', password: '' },
 *   validationRules: {
 *     email: [
 *       { required: true, message: 'Email is required' },
 *       { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
 *     ],
 *     password: [
 *       { required: true, message: 'Password is required' },
 *       { minLength: 8, message: 'Password must be at least 8 characters' },
 *     ],
 *   },
 *   onSubmit: async (values) => {
 *     await saveUser(values);
 *   },
 * });
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

/**
 * Validate a single value against a rule
 */
const validateRule = async (value, rule, values) => {
  // Required check
  if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return rule.message || 'This field is required';
  }

  // Don't run other validations if value is empty and not required
  if (!value && !rule.required) {
    return null;
  }

  // Min length
  if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
    return rule.message || `Must be at least ${rule.minLength} characters`;
  }

  // Max length
  if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
    return rule.message || `Must be no more than ${rule.maxLength} characters`;
  }

  // Min value (for numbers)
  if (rule.min !== undefined && Number(value) < rule.min) {
    return rule.message || `Must be at least ${rule.min}`;
  }

  // Max value (for numbers)
  if (rule.max !== undefined && Number(value) > rule.max) {
    return rule.message || `Must be no more than ${rule.max}`;
  }

  // Pattern (regex)
  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
    return rule.message || 'Invalid format';
  }

  // Custom validation function
  if (rule.validate && typeof rule.validate === 'function') {
    const result = await rule.validate(value, values);
    if (result !== true && result !== null && result !== undefined) {
      return typeof result === 'string' ? result : (rule.message || 'Invalid value');
    }
  }

  // Match another field (e.g., password confirmation)
  if (rule.match && values[rule.match] !== value) {
    return rule.message || `Must match ${rule.match}`;
  }

  return null;
};

/**
 * Validate a single field against all its rules
 */
const validateField = async (name, value, rules, values) => {
  if (!rules || !rules.length) return null;

  for (const rule of rules) {
    const error = await validateRule(value, rule, values);
    if (error) return error;
  }

  return null;
};

/**
 * Main form validation hook
 */
const useFormValidation = ({
  initialValues = {},
  validationRules = {},
  onSubmit,
  validateOnChange = true,
  validateOnBlur = true,
  debounceMs = 300,
}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [asyncValidating, setAsyncValidating] = useState({});

  // Refs for debouncing
  const debounceTimers = useRef({});
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    const timers = debounceTimers.current;
    return () => {
      mountedRef.current = false;
      // Clear all timers
      Object.values(timers).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Reset form to initial values
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Set a single field value
  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  // Set a single field error
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  // Validate a single field with debouncing
  const validateFieldDebounced = useCallback(async (name, value, immediate = false) => {
    const rules = validationRules[name];
    if (!rules) return;

    // Clear existing timer
    if (debounceTimers.current[name]) {
      clearTimeout(debounceTimers.current[name]);
    }

    const runValidation = async () => {
      // Check for async rules
      const hasAsyncRules = rules.some(r => typeof r.validate === 'function');
      if (hasAsyncRules) {
        setAsyncValidating(prev => ({ ...prev, [name]: true }));
      }

      try {
        const error = await validateField(name, value, rules, values);
        if (mountedRef.current) {
          setErrors(prev => ({ ...prev, [name]: error }));
        }
      } finally {
        if (mountedRef.current) {
          setAsyncValidating(prev => ({ ...prev, [name]: false }));
        }
      }
    };

    if (immediate) {
      await runValidation();
    } else {
      debounceTimers.current[name] = setTimeout(runValidation, debounceMs);
    }
  }, [validationRules, values, debounceMs]);

  // Validate all fields
  const validateAll = useCallback(async () => {
    const newErrors = {};
    const fieldNames = Object.keys(validationRules);

    await Promise.all(
      fieldNames.map(async (name) => {
        const error = await validateField(name, values[name], validationRules[name], values);
        if (error) {
          newErrors[name] = error;
        }
      })
    );

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [validationRules, values]);

  // Handle input change
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setValues(prev => ({ ...prev, [name]: newValue }));

    if (validateOnChange && touched[name]) {
      validateFieldDebounced(name, newValue);
    }
  }, [validateOnChange, touched, validateFieldDebounced]);

  // Handle input blur
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;

    setTouched(prev => ({ ...prev, [name]: true }));

    if (validateOnBlur) {
      validateFieldDebounced(name, value, true); // Immediate validation on blur
    }
  }, [validateOnBlur, validateFieldDebounced]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
    }

    // Mark all fields as touched
    const allTouched = {};
    Object.keys(validationRules).forEach(name => {
      allTouched[name] = true;
    });
    setTouched(allTouched);

    setIsSubmitting(true);

    try {
      const isValid = await validateAll();

      if (isValid && onSubmit) {
        await onSubmit(values);
      }

      return isValid;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [validationRules, validateAll, onSubmit, values]);

  // Get props for a form field (spread onto input)
  const getFieldProps = useCallback((name) => ({
    name,
    value: values[name] || '',
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': touched[name] && errors[name] ? 'true' : undefined,
    'aria-describedby': touched[name] && errors[name] ? `${name}-error` : undefined,
  }), [values, handleChange, handleBlur, touched, errors]);

  // Get props for error message (spread onto error element)
  const getErrorProps = useCallback((name) => ({
    id: `${name}-error`,
    role: 'alert',
    'aria-live': 'polite',
  }), []);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).every(key => !errors[key]);
  }, [errors]);

  // Check if any async validation is in progress
  const isAsyncValidating = useMemo(() => {
    return Object.values(asyncValidating).some(Boolean);
  }, [asyncValidating]);

  // Get field state (for custom UI)
  const getFieldState = useCallback((name) => ({
    value: values[name],
    error: errors[name],
    touched: touched[name],
    isValidating: asyncValidating[name],
    hasError: touched[name] && errors[name],
    isValid: touched[name] && !errors[name] && values[name],
  }), [values, errors, touched, asyncValidating]);

  return {
    // State
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    isAsyncValidating,

    // Actions
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    reset,
    validateField: validateFieldDebounced,
    validateAll,

    // Helpers
    getFieldProps,
    getErrorProps,
    getFieldState,
  };
};

export default useFormValidation;

// Also export common validation patterns
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
  phone: /^\+?[\d\s-]{10,}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  username: /^[a-zA-Z0-9_-]{3,20}$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};
