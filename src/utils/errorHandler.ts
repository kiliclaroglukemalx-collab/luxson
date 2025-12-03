/**
 * Centralized error handling utilities
 */

export interface AppError {
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

export class CustomError extends Error {
  code?: string;
  details?: any;

  constructor(message: string, code?: string, details?: any) {
    super(message);
    this.name = 'CustomError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Handles Supabase errors and converts them to user-friendly messages
 */
export function handleSupabaseError(error: any): string {
  if (!error) return 'Bilinmeyen bir hata oluştu';

  // Supabase error structure
  if (error.message) {
    // Check for common Supabase error codes
    if (error.code === 'PGRST116') {
      return 'Kayıt bulunamadı';
    }
    if (error.code === '23505') {
      return 'Bu kayıt zaten mevcut';
    }
    if (error.code === '23503') {
      return 'İlişkili bir kayıt bulunamadı';
    }
    if (error.code === '42501') {
      return 'Bu işlem için yetkiniz yok';
    }

    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Bir hata oluştu. Lütfen tekrar deneyin.';
}

/**
 * Logs error to console and optionally to external service
 */
export function logError(error: AppError | Error, context?: string): void {
  const errorData: AppError = {
    message: error.message,
    code: 'code' in error ? error.code : undefined,
    details: 'details' in error ? error.details : undefined,
    timestamp: new Date().toISOString(),
  };

  console.error(`[${context || 'App'}] Error:`, errorData);

  // TODO: Send to error tracking service (e.g., Sentry)
  // if (import.meta.env.PROD) {
  //   errorTrackingService.captureException(error, { context });
  // }
}

/**
 * Safe async wrapper that handles errors automatically
 */
export async function safeAsync<T>(
  asyncFn: () => Promise<T>,
  errorMessage?: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await asyncFn();
    return { data, error: null };
  } catch (error) {
    const message = errorMessage || handleSupabaseError(error);
    logError(error as Error);
    return { data: null, error: message };
  }
}

/**
 * Formats error for display to user
 */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof CustomError) {
    return error.message;
  }

  if (error instanceof Error) {
    return handleSupabaseError(error);
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Beklenmeyen bir hata oluştu';
}

