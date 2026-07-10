'use client';

import { useState, useCallback } from 'react';
import { showToast } from './toast';

/**
 * Custom hook for handling API calls with loading and error states
 * Usage:
 * const { data, loading, error, fetchData } = useFetch('/api/endpoint');
 * 
 * await fetchData(); // Triggers fetch with GET (default)
 * await fetchData({ method: 'POST', body: { ... } }); // POST request
 */
export function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        ...options,
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.message || 'An error occurred';
        setError(errorMessage);
        if (options.showError !== false) {
          showToast.error(errorMessage);
        }
        return { success: false, data: result };
      }

      setData(result);
      if (options.showSuccess) {
        showToast.success(options.showSuccess);
      }
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Network error occurred';
      setError(errorMessage);
      if (options.showError !== false) {
        showToast.error(errorMessage);
      }
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [url]);

  return { data, loading, error, fetchData };
}

/**
 * Hook for handling form submissions with API calls
 * Usage:
 * const { formData, handleChange, handleSubmit, loading } = useFormSubmit(
 *   { email: '', password: '' },
 *   '/api/auth/login'
 * );
 */
export function useFormSubmit(initialData, apiUrl, onSuccess) {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e, options = {}) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          setErrors(result.errors);
        }
        showToast.error(result.message || 'An error occurred');
        return { success: false };
      }

      setFormData(initialData);
      setErrors({});
      showToast.success(options.successMessage || 'Success!');
      
      if (onSuccess) {
        onSuccess(result);
      }

      return { success: true, data: result };
    } catch (error) {
      showToast.error(error.message || 'Network error');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { formData, handleChange, handleSubmit, loading, errors, setFormData, setErrors };
}

export default useFetch;
