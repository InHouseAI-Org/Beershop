import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for handling form submissions with loading states and navigation blocking
 *
 * Features:
 * - Shows processing state during submission
 * - Blocks navigation (back button, route changes) during submission
 * - Shows browser alerts for errors and warnings
 * - Prevents multiple simultaneous submissions
 *
 * @returns {Object} { isSubmitting, handleSubmit, setError, setWarning }
 */
export const useFormSubmit = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Block navigation during form submission
  useEffect(() => {
    if (!isSubmitting) return;

    // Prevent back button
    const handlePopState = (e) => {
      e.preventDefault();
      alert('⚠️ Please wait, processing your request...\n\nकृपया प्रतीक्षा करें, आपका अनुरोध संसाधित हो रहा है...');
      window.history.pushState(null, '', window.location.pathname);
    };

    // Prevent page unload/refresh
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Your form is being submitted. Are you sure you want to leave?';
      return e.returnValue;
    };

    // Add blocking
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSubmitting]);

  /**
   * Wrapper for form submission that handles loading state and errors
   * @param {Function} submitFunction - Async function to execute
   * @param {Object} options - Configuration options
   * @returns {Promise<boolean>} - Returns true if successful, false otherwise
   */
  const handleSubmit = useCallback(async (submitFunction, options = {}) => {
    const {
      onSuccess = null,
      onError = null,
      successMessage = '✅ Operation completed successfully!\n\nसफलतापूर्वक पूर्ण हुआ!',
      showSuccessAlert = true
    } = options;

    if (isSubmitting) {
      alert('⚠️ Please wait, another operation is in progress.\n\nकृपया प्रतीक्षा करें, एक और कार्य प्रगति पर है।');
      return false;
    }

    setIsSubmitting(true);

    try {
      // Execute the submit function
      const result = await submitFunction();

      // Show success alert if enabled
      if (showSuccessAlert) {
        alert(successMessage);
      }

      // Call success callback if provided
      if (onSuccess) {
        await onSuccess(result);
      }

      return true;
    } catch (error) {
      console.error('Form submission error:', error);

      // Determine error message
      let errorMessage = '❌ An error occurred. Please try again.\n\nएक त्रुटि उत्पन्न हुई। कृपया पुनः प्रयास करें।';

      if (error.response?.data?.error) {
        errorMessage = `❌ ${error.response.data.error}\n\nत्रुटि: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage = `❌ ${error.message}\n\nत्रुटि: ${error.message}`;
      }

      // Show error alert
      alert(errorMessage);

      // Call error callback if provided
      if (onError) {
        await onError(error);
      }

      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  /**
   * Show error alert
   */
  const showError = useCallback((message) => {
    alert(`❌ ${message}`);
  }, []);

  /**
   * Show warning alert
   */
  const showWarning = useCallback((message) => {
    alert(`⚠️ ${message}`);
  }, []);

  /**
   * Show info alert
   */
  const showInfo = useCallback((message) => {
    alert(`ℹ️ ${message}`);
  }, []);

  /**
   * Show success alert
   */
  const showSuccess = useCallback((message) => {
    alert(`✅ ${message}`);
  }, []);

  return {
    isSubmitting,
    handleSubmit,
    showError,
    showWarning,
    showInfo,
    showSuccess
  };
};

export default useFormSubmit;
