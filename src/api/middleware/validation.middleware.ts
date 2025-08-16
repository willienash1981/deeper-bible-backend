import { Request, Response, NextFunction } from 'express';
import * as Joi from 'joi';

// Enhanced validation middleware addressing audit findings
export const validate = (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = schema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true,     // Prevent mass assignment by removing unknown fields
    allowUnknown: false,    // Explicitly disallow unknown fields
    convert: true,          // Type conversion
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    }));
    
    console.warn(`Validation failed for ${req.method} ${req.path}:`, errors);
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors 
    });
  }

  // Replace request body with validated/sanitized values
  req.body = value;
  next();
};

// Query parameter validation
export const validateQuery = (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
    convert: true,
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    }));
    
    console.warn(`Query validation failed for ${req.method} ${req.path}:`, errors);
    return res.status(400).json({ 
      error: 'Query validation failed',
      details: errors 
    });
  }

  req.query = value;
  next();
};

// URL parameter validation
export const validateParams = (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = schema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
    convert: true,
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    }));
    
    console.warn(`Parameter validation failed for ${req.method} ${req.path}:`, errors);
    return res.status(400).json({ 
      error: 'Parameter validation failed',
      details: errors 
    });
  }

  req.params = value;
  next();
};

// Enhanced schemas with stronger security
export const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })  // Allow all TLDs
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),
    
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes',
    }),
    
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes',
    }),
    
  acceptTerms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the terms and conditions',
    }),
}).options({ 
  stripUnknown: true,
  abortEarly: false,
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required(),
    
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
}).options({ 
  stripUnknown: true,
  abortEarly: false,
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .optional(),
    
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .optional(),
    
  denomination: Joi.string()
    .valid(
      'catholic', 'protestant', 'orthodox', 'evangelical', 'pentecostal',
      'baptist', 'methodist', 'presbyterian', 'lutheran', 'anglican',
      'nondenominational', 'other'
    )
    .optional(),
    
  preferredTranslation: Joi.string()
    .valid('KJV', 'NIV', 'ESV', 'NKJV', 'NLT', 'NASB', 'CSB')
    .optional(),
    
  emailNotifications: Joi.boolean()
    .optional(),
}).options({ 
  stripUnknown: true,  // Critical: Prevents mass assignment
  abortEarly: false,
});

// Bible verse query validation
export const verseQuerySchema = Joi.object({
  bookId: Joi.string()
    .pattern(/^[a-z-]+$/)
    .min(2)
    .max(20)
    .required()
    .messages({
      'string.pattern.base': 'Book ID must contain only lowercase letters and hyphens',
    }),
    
  chapter: Joi.number()
    .integer()
    .min(1)
    .max(150)
    .required(),
    
  verses: Joi.string()
    .pattern(/^\d+(-\d+)?(,\d+(-\d+)?)*$/)
    .optional()
    .messages({
      'string.pattern.base': 'Verses must be in format: "1" or "1-5" or "1,3,5-7"',
    }),
    
  translation: Joi.string()
    .valid('KJV', 'NIV', 'ESV', 'NKJV', 'NLT', 'NASB', 'CSB')
    .default('KJV')
    .optional(),
}).options({ 
  stripUnknown: true,
  abortEarly: false,
});

// Search query validation
export const searchQuerySchema = Joi.object({
  query: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.min': 'Search query must be at least 3 characters',
      'string.max': 'Search query cannot exceed 200 characters',
    }),
    
  books: Joi.array()
    .items(Joi.string().pattern(/^[a-z-]+$/))
    .max(66)
    .optional(),
    
  testament: Joi.string()
    .valid('old', 'new', 'both')
    .default('both')
    .optional(),
    
  page: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(1)
    .optional(),
    
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional(),
}).options({ 
  stripUnknown: true,
  abortEarly: false,
});

// Report generation validation
export const reportGenerationSchema = Joi.object({
  bookId: Joi.string()
    .pattern(/^[a-z-]+$/)
    .min(2)
    .max(20)
    .required(),
    
  chapter: Joi.number()
    .integer()
    .min(1)
    .max(150)
    .required(),
    
  verses: Joi.string()
    .pattern(/^\d+(-\d+)?(,\d+(-\d+)?)*$/)
    .required(),
    
  analysisTypes: Joi.array()
    .items(Joi.string().valid(
      'theological', 'historical', 'symbolic', 'crossReference', 
      'denominational', 'linguistic', 'cultural'
    ))
    .min(1)
    .max(5)
    .required()
    .messages({
      'array.min': 'At least one analysis type is required',
      'array.max': 'Maximum 5 analysis types allowed',
    }),
    
  denomination: Joi.string()
    .valid(
      'catholic', 'protestant', 'orthodox', 'evangelical', 'pentecostal',
      'baptist', 'methodist', 'presbyterian', 'lutheran', 'anglican',
      'nondenominational'
    )
    .optional(),
    
  includeOriginalLanguages: Joi.boolean()
    .default(false)
    .optional(),
    
  depth: Joi.string()
    .valid('basic', 'standard', 'comprehensive')
    .default('standard')
    .optional(),
}).options({ 
  stripUnknown: true,
  abortEarly: false,
});

// UUID parameter validation
export const uuidParamSchema = Joi.object({
  id: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Invalid ID format. Must be a valid UUID.',
    }),
}).options({ 
  stripUnknown: true,
  abortEarly: false,
});

// File upload validation
export const fileUploadSchema = Joi.object({
  filename: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .pattern(/^[a-zA-Z0-9._-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Filename can only contain letters, numbers, dots, hyphens, and underscores',
    }),
    
  mimetype: Joi.string()
    .valid(
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'text/plain',
      'application/json'
    )
    .required(),
    
  size: Joi.number()
    .max(10 * 1024 * 1024) // 10MB max
    .required()
    .messages({
      'number.max': 'File size cannot exceed 10MB',
    }),
}).options({ 
  stripUnknown: true,
  abortEarly: false,
});

// Request size limiting middleware
export const limitRequestSize = (maxSize: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Request too large',
        message: `Request size ${contentLength} bytes exceeds maximum allowed ${maxSize} bytes`,
      });
    }
    
    next();
  };
};

// Content type validation middleware
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      return res.status(400).json({
        error: 'Missing Content-Type',
        message: 'Content-Type header is required',
      });
    }
    
    const baseType = contentType.split(';')[0].trim().toLowerCase();
    
    if (!allowedTypes.includes(baseType)) {
      return res.status(415).json({
        error: 'Unsupported Media Type',
        message: `Content-Type ${baseType} is not supported. Allowed types: ${allowedTypes.join(', ')}`,
      });
    }
    
    next();
  };
};