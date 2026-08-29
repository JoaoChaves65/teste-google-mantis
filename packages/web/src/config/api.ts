export interface ApiConfig {
  baseUrl: string;
}

export const apiConfig: ApiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
};
