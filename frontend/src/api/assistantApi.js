import { axiosClient } from './axiosClient';

export const assistantApi = {
  /**
   * Multi-turn chat with EngageAI Gemini Assistant.
   * @param {Array<{sender: string, text: string}>} messages
   * @param {string} [apiKey] - Optional custom Gemini API key
   * @param {string} [model] - Optional model override ('gemini-3.6-flash', etc.)
   */
  chat: (messages, apiKey = null, model = null) => {
    const headers = {};
    if (apiKey && apiKey.trim()) {
      headers['X-Gemini-Api-Key'] = apiKey.trim();
    }
    return axiosClient.post(
      '/assistant/chat',
      {
        messages,
        api_key: apiKey ? apiKey.trim() : null,
        model: model || 'gemini-3.6-flash',
      },
      { headers }
    );
  },

  /**
   * Get server-side Gemini configuration and database context status.
   */
  getStatus: () => axiosClient.get('/assistant/status'),
};
