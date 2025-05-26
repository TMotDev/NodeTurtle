import z from 'zod'

export const usernameSchema = z
  .string()
  .min(3, { message: 'Username must be at least 3 characters long.' })
  .max(20, { message: 'Username must be at most 20 characters long.' })
  .regex(/^[a-zA-Z0-9]+$/, {
    message: 'Username can only contain alphanumeric characters.',
  })

export const emailSchema = z
  .string()
  .email({ message: 'Please enter a valid email address.' })
  .min(1)

export const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long.' })
