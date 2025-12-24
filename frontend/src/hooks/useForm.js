/**
 * useForm - Standardized form state management
 *
 * Provides consistent form handling across the application:
 * - Controlled input handling
 * - Validation support
 * - Async submission with loading state
 * - Error handling with field-level errors
 * - Reset and dirty state tracking
 *
 * @example
 * const { values, errors, handleChange, handleSubmit, isSubmitting, isValid } = useForm({
 *   initialValues: { email: '', password: '' },
 *   validate: (values) => {
 *     const errors = {};
 *     if (!values.email) errors.email = 'Email is required';
 *     if (!values.password) errors.password = 'Password is required';
 *     return errors;
 *   },
 *   onSubmit: async (values) => {
 *     await api.login(values);
 *   },
 * });
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * @typedef {Object} UseFormOptions
 * @property {Object} initialValues - Initial form values
 * @property {Function} [validate] - Validation function (values) => errors
 * @property {Function} [onSubmit] - Submit handler (values) => Promise
 * @property {boolean} [validateOnChange=false] - Validate on every change
 * @property {boolean} [validateOnBlur=true] - Validate on blur
 * @property {boolean} [resetOnSubmit=false] - Reset form after successful submit
 */

export function useForm({
  initialValues = {},
  validate,
  onSubmit,
  validateOnChange = false,
  validateOnBlur = true,
  resetOnSubmit = false,
} = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitCount, setSubmitCount] = useState(0);

  // Track initial values for reset and dirty detection
  const initialValuesRef = useRef(initialValues);

  // Update initial values ref if they change externally
  useEffect(() => {
    initialValuesRef.current = initialValues;
  }, [initialValues]);

  /**
   * Run validation and return errors
   */
  const runValidation = useCallback((valuesToValidate) => {
    if (!validate) return {};
    const validationErrors = validate(valuesToValidate);
    return validationErrors || {};
  }, [validate]);

  /**
   * Check if form has any errors
   */
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  /**
   * Check if form is dirty (values changed from initial)
   */
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);
  }, [values]);

  /**
   * Handle input change
   */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked, files } = e.target;

    let newValue;
    if (type === 'checkbox') {
      newValue = checked;
    } else if (type === 'file') {
      newValue = files?.[0] || null;
    } else if (type === 'number') {
      newValue = value === '' ? '' : Number(value);
    } else {
      newValue = value;
    }

    setValues(prev => {
      const newValues = { ...prev, [name]: newValue };

      // Validate on change if enabled
      if (validateOnChange) {
        const newErrors = runValidation(newValues);
        setErrors(newErrors);
      }

      return newValues;
    });

    // Clear submit error when user starts typing
    if (submitError) {
      setSubmitError(null);
    }
  }, [validateOnChange, runValidation, submitError]);

  /**
   * Handle blur for field
   */
  const handleBlur = useCallback((e) => {
    const { name } = e.target;

    setTouched(prev => ({ ...prev, [name]: true }));

    if (validateOnBlur) {
      const newErrors = runValidation(values);
      setErrors(newErrors);
    }
  }, [validateOnBlur, runValidation, values]);

  /**
   * Set a specific field value programmatically
   */
  const setFieldValue = useCallback((name, value) => {
    setValues(prev => {
      const newValues = { ...prev, [name]: value };

      if (validateOnChange) {
        const newErrors = runValidation(newValues);
        setErrors(newErrors);
      }

      return newValues;
    });
  }, [validateOnChange, runValidation]);

  /**
   * Set multiple field values at once
   */
  const setFieldValues = useCallback((updates) => {
    setValues(prev => {
      const newValues = { ...prev, ...updates };

      if (validateOnChange) {
        const newErrors = runValidation(newValues);
        setErrors(newErrors);
      }

      return newValues;
    });
  }, [validateOnChange, runValidation]);

  /**
   * Set a specific field error
   */
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  /**
   * Clear a specific field error
   */
  const clearFieldError = useCallback((name) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  /**
   * Set field as touched
   */
  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
  }, []);

  /**
   * Reset form to initial values
   */
  const reset = useCallback((newInitialValues) => {
    const resetValues = newInitialValues || initialValuesRef.current;
    setValues(resetValues);
    setErrors({});
    setTouched({});
    setSubmitError(null);
    setIsSubmitting(false);

    if (newInitialValues) {
      initialValuesRef.current = newInitialValues;
    }
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
    }

    setSubmitCount(c => c + 1);
    setSubmitError(null);

    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    // Run validation
    const validationErrors = runValidation(values);
    setErrors(validationErrors);

    // If there are errors, focus the first invalid field
    if (Object.keys(validationErrors).length > 0) {
      const firstErrorField = Object.keys(validationErrors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      element?.focus();
      return;
    }

    // Submit
    if (!onSubmit) return;

    setIsSubmitting(true);

    try {
      await onSubmit(values);

      if (resetOnSubmit) {
        reset();
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.error
        || error?.response?.data?.message
        || error?.message
        || 'An error occurred';
      setSubmitError(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, runValidation, onSubmit, resetOnSubmit, reset]);

  /**
   * Get props for an input field
   */
  const getFieldProps = useCallback((name) => ({
    name,
    value: values[name] ?? '',
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': touched[name] && errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  }), [values, handleChange, handleBlur, touched, errors]);

  /**
   * Get error for a field (only if touched)
   */
  const getFieldError = useCallback((name) => {
    return touched[name] ? errors[name] : undefined;
  }, [touched, errors]);

  /**
   * Check if field has error (and is touched)
   */
  const hasFieldError = useCallback((name) => {
    return touched[name] && !!errors[name];
  }, [touched, errors]);

  return {
    // State
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    submitError,
    submitCount,

    // Handlers
    handleChange,
    handleBlur,
    handleSubmit,

    // Field operations
    setFieldValue,
    setFieldValues,
    setFieldError,
    clearFieldError,
    setFieldTouched,

    // Utilities
    reset,
    getFieldProps,
    getFieldError,
    hasFieldError,

    // Raw setters (escape hatch)
    setValues,
    setErrors,
    setTouched,
  };
}

export default useForm;
