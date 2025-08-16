import { IsString, IsNotEmpty, IsEnum, IsOptional, validate, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import DOMPurify from 'isomorphic-dompurify';
// Temporarily removed import until types file is available
// import { InsightType } from '../services/ai/types';

// Define InsightType enum locally for validation
enum InsightType {
  THEOLOGICAL = 'theological',
  HISTORICAL = 'historical',
  PRACTICAL = 'practical',
  PROPHETIC = 'prophetic'
}

export class InsightParamsDto {
  @IsString()
  @IsNotEmpty()
  bibleReference!: string;

  @IsEnum(InsightType)
  insightType!: InsightType;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  contextualInfo?: {
    denomination?: string;
    focusArea?: string[];
    previousInsights?: string[];
  };
}

export class CostTrackingDto {
  @IsNumber()
  @Min(0)
  tokens!: number;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  insightId?: string;
}

export class BudgetLimitDto {
  @IsNumber()
  @Min(0)
  @Max(10000)
  dailyLimit!: number;

  @IsNumber()
  @Min(0)
  @Max(100000)
  monthlyLimit!: number;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

export const validateInput = {
  isString: (value: any): value is string => {
    return typeof value === 'string';
  },

  isValidBibleReference: (reference: string): boolean => {
    // Basic Bible reference validation
    const bibleRefPattern = /^([1-3]?\s?[A-Za-z]+\.?\s+\d+(?::\d+(?:-\d+)?)?(?:,\s*\d+(?::\d+(?:-\d+)?)?)*)$/;
    return bibleRefPattern.test(reference.trim());
  },

  sanitizeText: (text: string): string => {
    // Remove potentially dangerous content
    let sanitized = text;
    
    // Remove HTML/XML tags and scripts
    sanitized = DOMPurify.sanitize(sanitized, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [] 
    });
    
    // Remove SQL injection patterns
    sanitized = sanitized.replace(/['";\\]/g, '');
    sanitized = sanitized.replace(/\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|EXECUTE)\b/gi, '');
    
    // Remove potential prompt injection
    sanitized = sanitized.replace(/\b(ignore|disregard|forget)\s+(previous|all|prior)\s+(instructions?|prompts?)/gi, '');
    sanitized = sanitized.replace(/\[INST\]|\{\{system\}\}|<system>/gi, '');
    
    // Limit length
    const maxLength = 10000;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized.trim();
  },

  sanitizeBibleReference: (reference: string): string => {
    // Allow only valid Bible reference characters
    const cleaned = reference.replace(/[^a-zA-Z0-9\s:,-]/g, '');
    return cleaned.trim();
  },

  validateAndSanitizeInsightParams: async (params: any): Promise<InsightParamsDto> => {
    const dto = new InsightParamsDto();
    Object.assign(dto, params);
    
    // Sanitize string inputs
    if (dto.bibleReference) {
      dto.bibleReference = validateInput.sanitizeBibleReference(dto.bibleReference);
    }
    if (dto.language) {
      dto.language = validateInput.sanitizeText(dto.language);
    }
    if (dto.contextualInfo?.denomination) {
      dto.contextualInfo.denomination = validateInput.sanitizeText(dto.contextualInfo.denomination);
    }
    if (dto.contextualInfo?.focusArea) {
      dto.contextualInfo.focusArea = dto.contextualInfo.focusArea.map(area => 
        validateInput.sanitizeText(area)
      );
    }
    if (dto.contextualInfo?.previousInsights) {
      dto.contextualInfo.previousInsights = dto.contextualInfo.previousInsights.map(insight => 
        validateInput.sanitizeText(insight)
      );
    }
    
    // Validate with class-validator
    const errors = await validate(dto);
    if (errors.length > 0) {
      const errorMessages = errors.map(error => 
        Object.values(error.constraints || {}).join(', ')
      ).join('; ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    
    return dto;
  },

  validateCostTracking: async (params: any): Promise<CostTrackingDto> => {
    const dto = new CostTrackingDto();
    Object.assign(dto, params);
    
    const errors = await validate(dto);
    if (errors.length > 0) {
      const errorMessages = errors.map(error => 
        Object.values(error.constraints || {}).join(', ')
      ).join('; ');
      throw new Error(`Cost tracking validation failed: ${errorMessages}`);
    }
    
    return dto;
  },

  validateBudgetLimits: async (params: any): Promise<BudgetLimitDto> => {
    const dto = new BudgetLimitDto();
    Object.assign(dto, params);
    
    const errors = await validate(dto);
    if (errors.length > 0) {
      const errorMessages = errors.map(error => 
        Object.values(error.constraints || {}).join(', ')
      ).join('; ');
      throw new Error(`Budget validation failed: ${errorMessages}`);
    }
    
    return dto;
  },

  isValidUserId: (userId: string): boolean => {
    // UUID v4 validation
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(userId);
  },

  isValidModel: (model: string): boolean => {
    const allowedModels = [
      'gpt-4-turbo-preview',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ];
    return allowedModels.includes(model);
  },

  sanitizeLogData: (data: any): any => {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['apiKey', 'password', 'secret', 'token', 'key'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
};