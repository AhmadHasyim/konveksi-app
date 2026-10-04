/**
 * Standar response untuk server actions / data access.
 * Error internal (mis. database) tidak pernah diteruskan ke client;
 * gunakan pesan generik berbahasa Indonesia.
 */
export interface ActionSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ActionFailure {
  success: false;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export type ActionResponse<T> = ActionSuccess<T> | ActionFailure;

export function ok<T>(data: T, message?: string): ActionSuccess<T> {
  return { success: true, data, message };
}

export function fail(
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionFailure {
  return { success: false, code, message, fieldErrors };
}

/** Pesan generik untuk client; detail error hanya dicatat di server log. */
export const GENERIC_ERROR_MESSAGE =
  "Terjadi kesalahan. Silakan coba lagi.";
