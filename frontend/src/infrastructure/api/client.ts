import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// Global error normalisation — future: attach JWT here
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status: number = err.response?.status ?? 0
    const detail: string = err.response?.data?.detail ?? err.message
    return Promise.reject(new ApiError(status, detail))
  },
)

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}
