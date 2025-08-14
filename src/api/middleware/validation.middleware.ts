import { Request, Response, NextFunction } from 'express';
import Joi from 'joi'; // Assuming Joi will be used for schema validation

export const validate = (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => {
  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({ errors });
  }

  next();
};

// Example schemas (these would typically be in a separate 'schemas' directory)
export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const updateProfileSchema = Joi.object({
  // Define fields that can be updated
  email: Joi.string().email().optional(),
  // Add other profile fields
});