// Create a new file to handle API base URL
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  return '';
};

export const API_BASE_URL = getApiBaseUrl(); 