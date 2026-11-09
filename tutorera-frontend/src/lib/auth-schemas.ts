import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Full name is required').trim(),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['student', 'tutor', 'parent']),
  phone: z.string().optional().or(z.literal('')),
  city: z.string().min(1, 'City is required').trim(),
  countryCode: z.string().default('PK'),
  preferredLanguage: z.string().default('en'),
  dateOfBirth: z.string().optional().or(z.literal('')),
  guardianEmail: z.string().optional().or(z.literal('')),
  guardianName: z.string().optional().or(z.literal('')),
}).refine(
  (data) => {
    if (data.role !== 'student') return true;
    if (!data.dateOfBirth) return false;
    const date = new Date(data.dateOfBirth + 'T00:00:00.000Z');
    if (!Number.isFinite(date.getTime())) return false;
    const now = new Date();
    let years = now.getUTCFullYear() - date.getUTCFullYear();
    if (now.getUTCMonth() < date.getUTCMonth() ||
        (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate())) {
      years--;
    }
    return years >= 13 && years <= 110;
  },
  { path: ['dateOfBirth'], message: 'Student must be 13-110 years old' }
).refine(
  (data) => {
    if (data.role !== 'student') return true;
    if (!data.dateOfBirth) return false;
    const date = new Date(data.dateOfBirth + 'T00:00:00.000Z');
    if (!Number.isFinite(date.getTime())) return false;
    const now = new Date();
    let years = now.getUTCFullYear() - date.getUTCFullYear();
    if (now.getUTCMonth() < date.getUTCMonth() ||
        (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate())) {
      years--;
    }
    if (years >= 13 && years < 18) {
      return !!(data.guardianEmail && data.guardianName &&
                data.guardianEmail.toLowerCase() !== data.email.toLowerCase());
    }
    return true;
  },
  { path: ['guardianEmail'], message: 'Guardian email is required for ages 13-17 and must differ from student email' }
);

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordStep1Schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export const forgotPasswordStep2Schema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordStep1Data = z.infer<typeof forgotPasswordStep1Schema>;
export type ForgotPasswordStep2Data = z.infer<typeof forgotPasswordStep2Schema>;
