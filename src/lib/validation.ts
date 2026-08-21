import { z } from 'zod';

// Username / Nickname validation
export const UserNameSchema = z.object({
  userName: z
    .string({ required_error: 'First name or nickname is required.' })
    .trim()
    .min(2, 'Name must be at least 2 characters long.')
    .max(30, 'Name must be at most 30 characters long.')
    .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Name can only contain letters, numbers, spaces, underscores, or hyphens.'),
});

// Quiz Answer Submission validation
export const QuizSubmissionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required.'),
  userName: z.string().trim().min(2, 'Username is required.'),
  selectedOption: z.enum(['A', 'B', 'C', 'D'], {
    errorMap: () => ({ message: 'Selected option must be A, B, C, or D.' }),
  }),
  selectedOptionText: z.string().min(1, 'Selected option text is required.'),
  sessionToken: z.string().optional(),
});

// Question Bank CRUD validation
export const QuestionSchema = z.object({
  questionText: z.string().trim().min(10, 'Question text must be at least 10 characters long.'),
  optionA: z.string().trim().min(1, 'Option A is required.'),
  optionB: z.string().trim().min(1, 'Option B is required.'),
  optionC: z.string().trim().min(1, 'Option C is required.'),
  optionD: z.string().trim().min(1, 'Option D is required.'),
  correctOption: z.enum(['A', 'B', 'C', 'D'], {
    errorMap: () => ({ message: 'Correct option must be A, B, C, or D.' }),
  }),
  category: z.string().trim().min(2, 'Category is required.').default('General Security'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium'),
  active: z.boolean().default(true),
});

// Admin Password Auth validation
export const AdminAuthSchema = z.object({
  adminPassword: z.string().min(1, 'Admin password is required.'),
});

// User Profile validation
export const ProfileSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required.' })
    .trim()
    .min(2, 'Full name must be at least 2 characters long.')
    .max(100, 'Full name must be at most 100 characters long.'),
  nickname: z
    .string({ required_error: 'Nickname is required.' })
    .trim()
    .min(2, 'Nickname must be at least 2 characters long.')
    .max(30, 'Nickname must be at most 30 characters long.')
    .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Nickname can only contain letters, numbers, spaces, underscores, or hyphens.'),
  isNicknameSame: z.boolean().default(false),
  email: z
    .string({ required_error: 'Email address is required.' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.'),
  emailType: z.enum(['college', 'personal'], {
    errorMap: () => ({ message: 'Email type must be college or personal.' }),
  }).default('college'),
  registrationKey: z.string().trim().optional(),
  collegeName: z.string().trim().optional(),
  password: z.string().optional(),
});

// Registration Key Validation Schema
export const RegistrationKeyValidateSchema = z.object({
  registrationKey: z
    .string({ required_error: 'Registration key is required.' })
    .trim()
    .min(1, 'Registration key cannot be empty.'),
});

// Registration Key Update Schema (for Admin)
export const RegistrationKeyUpdateSchema = z.object({
  registrationKey: z
    .string({ required_error: 'New registration key is required.' })
    .trim()
    .min(1, 'Registration key cannot be empty.')
    .max(100, 'Registration key must be at most 100 characters.'),
});

// Department Schema for Super Admin
export const DepartmentSchema = z.object({
  collegeId: z.coerce.number().int().positive('College is required.'),
  departmentName: z
    .string({ required_error: 'Department name is required.' })
    .trim()
    .min(1, 'Department name is required.')
    .max(150, 'Department name must be at most 150 characters.'),
  registrationKey: z
    .string({ required_error: 'Registration key is required.' })
    .trim()
    .min(1, 'Registration key is required.')
    .max(100, 'Registration key must be at most 100 characters.'),
});

// College Schema for Super Admin
export const CollegeSchema = z.object({
  name: z
    .string({ required_error: 'College name is required.' })
    .trim()
    .min(2, 'College name must be at least 2 characters long.')
    .max(150, 'College name must be at most 150 characters long.'),
  identifier: z
    .string({ required_error: 'College identifier is required.' })
    .trim()
    .min(2, 'Identifier must be at least 2 characters long.')
    .max(50, 'Identifier must be at most 50 characters long.')
    .regex(/^[a-zA-Z0-9_\-]+$/, 'Identifier can only contain letters, numbers, hyphens, or underscores.'),
});

// Admin Account Creation Schema for Super Admin
export const AdminCreateSchema = z.object({
  email: z
    .string({ required_error: 'Admin email is required.' })
    .trim()
    .toLowerCase()
    .email('Admin username must be a valid email address.'),
  name: z.string().trim().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  collegeId: z.coerce.number().int().positive('Please select a valid college.').optional(),
  collegeName: z.string().trim().min(2, 'College name must be at least 2 characters long.').max(150).optional(),
  collegeIdentifier: z.string().trim().min(2, 'College identifier must be at least 2 characters.').max(50).optional(),
  departmentName: z.string().trim().min(1, 'Department name is required.').max(150).optional(),
  collegeDepartmentId: z.coerce.number().int().positive('Please select a valid department.').optional(),
  active: z.boolean().default(true),
});
