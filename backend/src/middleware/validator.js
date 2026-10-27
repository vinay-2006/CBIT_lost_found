import { z } from 'zod';

const CATEGORIES = ['Electronics', 'Documents', 'Books', 'Accessories', 'Others'];
const TYPES = ['lost', 'found'];
const STATUSES = ['active', 'resolved'];

// Indian phone regex: 10 digits starting with 6, 7, 8, or 9
const PHONE_REGEX = /^[6-9]\d{9}$/;
// Standard email regex matching frontend ReportItem.jsx
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// Date regex YYYY-MM-DD
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
// CBIT institutional email pattern
export const CBIT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)*cbit\.ac\.in$/i;
// Roll number pattern
export const ROLL_NO_REGEX = /^[0-9]{2}[A-Za-z0-9]{8,10}$/i;
// Password strength: at least 8 chars, at least one letter and one number
export const PASSWORD_STRENGTH_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

/**
 * Validation schema for student registration.
 */
export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Full name is required.' })
    .trim()
    .min(2, 'Name must be at least 2 characters long.')
    .max(255, 'Name cannot exceed 255 characters.'),
  email: z
    .string({ required_error: 'Institutional email is required.' })
    .trim()
    .toLowerCase()
    .regex(
      CBIT_EMAIL_REGEX,
      'Registration requires a valid CBIT institutional email ending in @cbit.ac.in'
    ),
  rollNo: z
    .string({ required_error: 'Roll number is required.' })
    .trim()
    .toUpperCase()
    .regex(ROLL_NO_REGEX, 'Enter a valid student roll number (e.g. 23A91A0501 or 160121733001).'),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(8, 'Password must be at least 8 characters long.')
    .max(100, 'Password cannot exceed 100 characters.')
    .regex(
      PASSWORD_STRENGTH_REGEX,
      'Password must contain at least one letter and at least one number.'
    )
});

/**
 * Validation schema for student login.
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Institutional email is required.' })
    .trim()
    .toLowerCase()
    .regex(EMAIL_REGEX, 'Enter a valid email address.'),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(1, 'Password cannot be empty.')
});

/**
 * Validation schema for changing student password.
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'Current password is required.' })
    .min(1, 'Current password cannot be empty.'),
  newPassword: z
    .string({ required_error: 'New password is required.' })
    .min(8, 'New password must be at least 8 characters long.')
    .max(100, 'New password cannot exceed 100 characters.')
    .regex(
      PASSWORD_STRENGTH_REGEX,
      'New password must contain at least one letter and at least one number.'
    )
});


/**
 * Validation schema for creating a report.
 */
export const createItemSchema = z
  .object({
    type: z.enum(TYPES, {
      errorMap: () => ({ message: "Type must be either 'lost' or 'found'." })
    }),
    itemName: z
      .string({ required_error: 'Item name is required.' })
      .trim()
      .min(1, 'Item name cannot be empty.')
      .max(255, 'Item name cannot exceed 255 characters.'),
    category: z.enum(CATEGORIES, {
      errorMap: () => ({
        message: `Category must be one of: ${CATEGORIES.join(', ')}.`
      })
    }),
    description: z
      .string({ required_error: 'Description is required.' })
      .trim()
      .min(1, 'Description cannot be empty.')
      .max(2000, 'Description cannot exceed 2000 characters.'),
    location: z
      .string({ required_error: 'Location is required.' })
      .trim()
      .min(1, 'Location cannot be empty.')
      .max(255, 'Location cannot exceed 255 characters.'),
    date: z
      .string({ required_error: 'Date is required.' })
      .regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format.'),
    reportedBy: z
      .string({ required_error: 'Your name is required.' })
      .trim()
      .min(1, 'Your name cannot be empty.')
      .max(255, 'Reporter name cannot exceed 255 characters.'),
    rollNo: z.string().trim().optional().default(''),
    contact: z
      .string({ required_error: 'Contact number is required.' })
      .trim()
      .regex(PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number (starts with 6-9).'),
    email: z
      .string({ required_error: 'Email is required.' })
      .trim()
      .regex(EMAIL_REGEX, 'Enter a valid email address.'),
    image: z.string().trim().optional().default(''),
    status: z.enum(STATUSES).optional().default('active')
  })
  .superRefine((data, ctx) => {
    if (data.type === 'lost' && (!data.rollNo || data.rollNo.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rollNo'],
        message: 'Roll number is required for lost item reports.'
      });
    }
  });

/**
 * Validation schema for updating an existing item.
 */
export const updateItemSchema = z
  .object({
    type: z.enum(TYPES).optional(),
    itemName: z.string().trim().min(1).max(255).optional(),
    category: z.enum(CATEGORIES).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    location: z.string().trim().min(1).max(255).optional(),
    date: z.string().regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format.').optional(),
    reportedBy: z.string().trim().min(1).max(255).optional(),
    rollNo: z.string().trim().optional(),
    contact: z.string().trim().regex(PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number.').optional(),
    email: z.string().trim().regex(EMAIL_REGEX, 'Enter a valid email address.').optional(),
    image: z.string().trim().optional(),
    status: z.enum(STATUSES).optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Request body must contain at least one field to update.'
  });

/**
 * Validation schema for item ID route parameter.
 */
export const idParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Item ID must be a positive integer.')
    .transform((val) => parseInt(val, 10))
});

/**
 * Validation schema for item search/filter query parameters.
 */
export const itemQuerySchema = z.object({
  type: z.enum(['lost', 'found']).optional(),
  category: z.string().optional(),
  status: z.enum(['active', 'resolved', 'all']).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['date', 'created_at', 'item_name', 'itemName', 'id']).optional().default('date'),
  order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional().default('desc')
});

/**
 * Generic middleware to validate request body, query, or params with a Zod schema.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
}
