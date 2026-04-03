/**
 * Formats and displays an error message to the user.
 * 
 * @param {Function} t - The translation function from useTranslation()
 * @param {Error|Object} err - The error object (usually from Axios)
 * @param {string} fallbackKey - The key to use if no specific error message is found
 */
export const showError = (t, err, fallbackKey = 'common.error_fail') => {
  const backendError = err.response?.data?.error;
  const axiosMessage = err.message;
  
  // Try to find the best message to show
  const msg = backendError || axiosMessage || t(fallbackKey);
  
  // Format the title (using common.error_title if it exists, else hardcoded fallback)
  const title = t('common.error_title') === 'common.error_title' ? 'System Error' : t('common.error_title');
  
  alert(`${title}: ${msg}`);
};
