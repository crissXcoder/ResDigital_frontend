import { createClient } from '../supabase/client';

export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isDefinitiveApiRejection(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    let errorData = null;
    try { errorData = JSON.parse(errorText); } catch { /* ignore */ }
    const message = errorData?.message;
    throw new ApiError(
      Array.isArray(message) ? message.join('. ') : typeof message === 'string' ? message : `No se pudo completar la solicitud (${response.status}).`,
      response.status,
    );
  }

  return (await response.json()) as T;
}
