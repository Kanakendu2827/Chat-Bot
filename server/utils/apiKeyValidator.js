/**
 * Validates API key format
 */
export const apiKeyValidator = {
  /**
   * Validate API key format
   */
  validate: (apiKey, isOpenRouter = false) => {
    if (!apiKey) {
      return false;
    }

    // Check for OAuth token or service account
    const isOAuthToken = /^(?:AQ\.|ya29\.|1\/|eyJ|ya29)[A-Za-z0-9_.-]+$/.test(apiKey);

    if (isOAuthToken) {
      console.warn('Invalid API key format: appears to be an OAuth token');
      return false;
    }

    if (isOpenRouter) {
      // OpenRouter keys should start with sk-or-
      return apiKey.startsWith('sk-or-');
    } else {
      // Gemini keys are typically longer alphanumeric strings
      return apiKey.length > 10;
    }
  },
};
