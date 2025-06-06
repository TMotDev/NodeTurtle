import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useCallback, useState } from 'react'
import type { ClassValue } from 'clsx'
import type z from 'zod'

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
    const endpoint =
      field === 'username'
        ? `/users/username/${encodeURIComponent(value)}`
        : `/users/email/${encodeURIComponent(value)}`

    const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`)

    if (response.ok) {
      const data = await response.json()
      return { exists: data.exists || false }
    } else {
      return { exists: false, error: 'Validation service unavailable' }
    }
  } catch (error) {
    return { exists: false, error: 'Network error during validation' }
  }
}

/**
 * Converts a date into a human-readable string showing the time difference.
 */
export function getTimeDifference(date: string): string {
  const now = new Date()
  const givenDate = new Date(date)

  // Calculate the difference in milliseconds
  const diffInMs = now.getTime() - givenDate.getTime()

  // If the difference is less than a day, return "today"
  if (diffInMs < 1000 * 60 * 60 * 24) {
    return 'today'
  }

  // Calculate the difference in days and months
  const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  const months = Math.floor(days / 30)
  const remainingDays = days % 30

  // Return the formatted string
  if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''} ${remainingDays} day${remainingDays > 1 ? 's' : ''}`
  }
  return `${days} day${days > 1 ? 's' : ''}`
}
