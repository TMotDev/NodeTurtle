import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useCallback, useState } from 'react'
import type { ClassValue } from 'clsx'
import type z from 'zod'
import { API } from '@/services/api'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export type ValidationStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'error'

export interface ValidationState {
  username: ValidationStatus
  email: ValidationStatus
}

// Exportable hook for field validation
export function useFieldValidation() {
  const [validationState, setValidationState] = useState<ValidationState>({
    username: 'idle',
    email: 'idle',
  })

  const validateField = useCallback(
    debounce(
      async (
        field: 'username' | 'email',
        value: string,
        schema?: z.ZodSchema,
      ) => {
        if (!value || value.length < 3) {
          setValidationState((prev) => ({ ...prev, [field]: 'idle' }))
          return
        }

        // validates against a schema first
        if (schema) {
          try {
            schema.parse(value)
          } catch (error) {
            setValidationState((prev) => ({ ...prev, [field]: 'idle' }))
            return
          }
        }

        setValidationState((prev) => ({ ...prev, [field]: 'checking' }))

        const result = await validateUserField(field, value)

        if (result.error) {
          setValidationState((prev) => ({ ...prev, [field]: 'error' }))
        } else {
          setValidationState((prev) => ({
            ...prev,
            [field]: result.exists ? 'taken' : 'available',
          }))
        }
      },
      500,
    ),
    [],
  )

  return {
    validationState,
    validateField,
    setValidationState,
  }
}

function debounce<T extends (...args: Array<any>) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Validates and checks availability of user or email in API
 */
export async function validateUserField(
  field: 'username' | 'email',
  value: string,
): Promise<{ exists: boolean; error?: string }> {
  try {
    let result
    if(field === 'username'){
      result = await API.get(`/users/username/${encodeURIComponent(value)}`)
    }
    else{
      result = await API.get(`/users/email/${encodeURIComponent(value)}`)
    }

    if (result.success) {
      return { exists: result.data.exists}
    } else {
      return { exists: false, error: 'Validation service unavailable' }
    }
  } catch (error) {
    return { exists: false, error: 'Network error during validation' }
  }
}


/**
 * Calculates a human-readable duration from now until a future date.
 * All calendar-based comparisons are done in UTC to prevent timezone errors.
 *
 * @param dateString A string representation of a future date (typically in UTC ISO format).
 * @returns A formatted duration string (e.g., "2 months", "7 days"). Returns "Expired" if the date is in the past.
 */
export function getTimeUntil(dateString: string): string {
  const now = new Date();
  const futureDate = new Date(dateString);

  const diffInMs = futureDate.getTime() - now.getTime();

  if (diffInMs <= 0) {
    return 'Expired';
  }

  return formatTimeDifference(diffInMs, futureDate, now);
}

/**
 * Calculates a human-readable duration from a past date until now.
 * All calendar-based comparisons are done in UTC to prevent timezone errors.
 *
 * @param dateString A string representation of a past date (typically in UTC ISO format).
 * @returns A formatted duration string (e.g., "2 months ago", "7 days ago"). Returns "Unknown" if the date is in the future.
 */
export function getTimeSince(dateString: string): string {
  const now = new Date();
  const pastDate = new Date(dateString);

  const diffInMs = now.getTime() - pastDate.getTime();

  if (diffInMs <= 0) {
    return 'Unknown';
  }

  return formatTimeDifference(diffInMs, now, pastDate) + ' ago';
}

/**
 * Shared formatting logic for time differences.
 *
 * @param diffInMs The difference in milliseconds (always positive)
 * @param laterDate The later date (for month calculations)
 * @param earlierDate The earlier date (for month calculations)
 * @returns A formatted duration string without "ago" suffix
 */
function formatTimeDifference(diffInMs: number, laterDate: Date, earlierDate: Date): string {
  const MS_PER_MINUTE = 1000 * 60;
  const MS_PER_HOUR = MS_PER_MINUTE * 60;
  const MS_PER_DAY = MS_PER_HOUR * 24;
  const MS_PER_WEEK = MS_PER_DAY * 7;

  if (diffInMs < MS_PER_HOUR) {
    const diffInMinutes = Math.floor(diffInMs / MS_PER_MINUTE);
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'}`;
  }

  if (diffInMs < MS_PER_DAY) {
    const diffInHours = Math.floor(diffInMs / MS_PER_HOUR);
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'}`;
  }

  if (diffInMs < MS_PER_WEEK) {
    const diffInDays = Math.floor(diffInMs / MS_PER_DAY);
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'}`;
  }

  const diffInDays = Math.floor(diffInMs / MS_PER_DAY);

  if (diffInDays < 30) {
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'}`;
  }

  let monthDiff = (laterDate.getUTCFullYear() - earlierDate.getUTCFullYear()) * 12;
  monthDiff -= earlierDate.getUTCMonth();
  monthDiff += laterDate.getUTCMonth();

  if (laterDate.getUTCDate() < earlierDate.getUTCDate()) {
    monthDiff--;
  }

  if (monthDiff <= 0) {
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'}`;
  }

  return `${monthDiff} month${monthDiff === 1 ? '' : 's'}`;
}

/**
 * Checks if a ban is still active based on its expiration date.
 *
 * @param expiresAt A string representation of the ban expiration date
 * @returns `true` if the ban is active (not expired), `false` otherwise.
 */
export function isBanActive(expiresAt: string): boolean {
  const now = new Date();
  const expirationDate = new Date(expiresAt);

  return expirationDate > now;
}