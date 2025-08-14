import openai from '../services/openai-client';
import { createLogger } from '../../utils/logger';
import { validateInput } from '../../utils/validation';
import { Logger } from 'winston';

interface ModerationResult {
  flagged: boolean;
  categories: string[];
  scores: Record<string, number>;
  explanation?: string;
}

interface ContentPolicy {
  maxLength: number;
  allowedLanguages: string[];
  blockedKeywords: string[];
  sensitiveTopics: string[];
}

export class ContentModerationService {
  private logger: Logger;
  private policy: ContentPolicy;
  private cache: Map<string, ModerationResult> = new Map();
  private cacheMaxSize = 1000;

  constructor() {
    this.logger = createLogger('ContentModerationService');
    this.policy = {
      maxLength: 10000,
      allowedLanguages: ['en', 'es', 'fr', 'de', 'pt', 'it'],
      blockedKeywords: [
        'hack', 'exploit', 'bypass', 'injection', 'malware',
        'phishing', 'scam', 'fraud', 'spam'
      ],
      sensitiveTopics: [
        'suicide', 'self-harm', 'violence', 'illegal activities',
        'discrimination', 'hate speech'
      ]
    };
  }

  /**
   * Moderates content before sending to LLM or storing.
   */
  async moderateContent(content: string, userId?: string): Promise<ModerationResult> {
    try {
      // Input validation
      if (!content || typeof content !== 'string') {
        throw new Error('Content must be a non-empty string');
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(content);
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        this.logger.debug('Content moderation result retrieved from cache', { userId });
        return cached;
      }

      // Run moderation checks
      const [
        openAIResult,
        customPolicyResult,
        lengthCheck,
        keywordCheck
      ] = await Promise.all([
        this.checkWithOpenAI(content),
        this.checkAgainstCustomPolicy(content),
        this.checkLength(content),
        this.checkBlockedKeywords(content)
      ]);

      // Combine all results
      const finalResult = this.combineResults([
        openAIResult,
        customPolicyResult,
        lengthCheck,
        keywordCheck
      ]);

      // Cache the result
      this.addToCache(cacheKey, finalResult);

      // Log the moderation result
      this.logger.info('Content moderation completed', {
        userId,
        flagged: finalResult.flagged,
        categories: finalResult.categories,
        contentLength: content.length
      });

      return finalResult;
    } catch (error) {
      this.logger.error('Error in content moderation', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        contentLength: content.length
      });
      
      // Be conservative and flag content on error
      return {
        flagged: true,
        categories: ['moderation_error'],
        scores: { moderation_error: 1.0 },
        explanation: 'Content moderation failed - blocked as safety measure'
      };
    }
  }

  /**
   * Check content using OpenAI's moderation API.
   */
  private async checkWithOpenAI(content: string): Promise<ModerationResult> {
    try {
      const response = await openai.moderations.create({
        input: content,
      });

      const result = response.results[0];
      const flaggedCategories: string[] = [];
      const scores: Record<string, number> = {};

      // Check each category
      Object.entries(result.categories).forEach(([category, flagged]) => {
        if (flagged) {
          flaggedCategories.push(category);
        }
      });

      // Record scores
      Object.entries(result.category_scores).forEach(([category, score]) => {
        scores[category] = score as number;
        // Also flag if score is above threshold (even if not flagged by OpenAI)
        if ((score as number) > 0.8 && !flaggedCategories.includes(category)) {
          flaggedCategories.push(category);
        }
      });

      return {
        flagged: flaggedCategories.length > 0,
        categories: flaggedCategories,
        scores,
        explanation: flaggedCategories.length > 0 
          ? `OpenAI moderation flagged: ${flaggedCategories.join(', ')}`
          : undefined
      };
    } catch (error) {
      this.logger.warn('OpenAI moderation check failed, allowing content', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Return safe on error to avoid blocking legitimate content
      return {
        flagged: false,
        categories: [],
        scores: {}
      };
    }
  }

  /**
   * Check content against custom policy rules.
   */
  private async checkAgainstCustomPolicy(content: string): Promise<ModerationResult> {
    const flaggedCategories: string[] = [];
    const scores: Record<string, number> = {};
    const lowerContent = content.toLowerCase();

    // Check for blocked keywords
    for (const keyword of this.policy.blockedKeywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        flaggedCategories.push('blocked_keyword');
        scores['blocked_keyword'] = 1.0;
        break;
      }
    }

    // Check for sensitive topics
    for (const topic of this.policy.sensitiveTopics) {
      if (lowerContent.includes(topic.toLowerCase())) {
        flaggedCategories.push('sensitive_topic');
        scores['sensitive_topic'] = 0.9;
        break;
      }
    }

    // Check for prompt injection attempts
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /disregard\s+all\s+prior/i,
      /forget\s+everything/i,
      /new\s+instructions:/i,
      /system\s*:\s*you\s+are/i,
      /\[INST\]/i,
      /\{\{system\}\}/i
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(content)) {
        flaggedCategories.push('prompt_injection');
        scores['prompt_injection'] = 1.0;
        break;
      }
    }

    return {
      flagged: flaggedCategories.length > 0,
      categories: flaggedCategories,
      scores,
      explanation: flaggedCategories.length > 0
        ? `Custom policy violation: ${flaggedCategories.join(', ')}`
        : undefined
    };
  }

  /**
   * Check content length against policy.
   */
  private async checkLength(content: string): Promise<ModerationResult> {
    if (content.length > this.policy.maxLength) {
      return {
        flagged: true,
        categories: ['content_too_long'],
        scores: { content_too_long: 1.0 },
        explanation: `Content exceeds maximum length of ${this.policy.maxLength} characters`
      };
    }

    return {
      flagged: false,
      categories: [],
      scores: {}
    };
  }

  /**
   * Check for blocked keywords.
   */
  private async checkBlockedKeywords(content: string): Promise<ModerationResult> {
    const lowerContent = content.toLowerCase();
    
    for (const keyword of this.policy.blockedKeywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        return {
          flagged: true,
          categories: ['blocked_keyword'],
          scores: { blocked_keyword: 1.0 },
          explanation: `Content contains blocked keyword: ${keyword}`
        };
      }
    }

    return {
      flagged: false,
      categories: [],
      scores: {}
    };
  }

  /**
   * Combine multiple moderation results.
   */
  private combineResults(results: ModerationResult[]): ModerationResult {
    const allCategories = new Set<string>();
    const combinedScores: Record<string, number> = {};
    const explanations: string[] = [];

    let isFlagged = false;

    for (const result of results) {
      if (result.flagged) {
        isFlagged = true;
      }

      result.categories.forEach(cat => allCategories.add(cat));
      Object.assign(combinedScores, result.scores);
      
      if (result.explanation) {
        explanations.push(result.explanation);
      }
    }

    return {
      flagged: isFlagged,
      categories: Array.from(allCategories),
      scores: combinedScores,
      explanation: explanations.length > 0 ? explanations.join('; ') : undefined
    };
  }

  /**
   * Cache management methods.
   */
  private generateCacheKey(content: string): string {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `mod_${Math.abs(hash)}`;
  }

  private addToCache(key: string, result: ModerationResult): void {
    // Implement simple LRU cache
    if (this.cache.size >= this.cacheMaxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, result);
  }

  /**
   * Clear moderation cache.
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Content moderation cache cleared');
  }

  /**
   * Update content policy.
   */
  updatePolicy(newPolicy: Partial<ContentPolicy>): void {
    this.policy = { ...this.policy, ...newPolicy };
    this.clearCache(); // Clear cache when policy changes
    this.logger.info('Content policy updated', { policy: this.policy });
  }

  /**
   * Get moderation statistics.
   */
  getStats(): {
    cacheSize: number;
    policy: ContentPolicy;
    cacheHitRate?: number;
  } {
    return {
      cacheSize: this.cache.size,
      policy: { ...this.policy }
    };
  }

  /**
   * Preprocess content before sending to LLM.
   */
  preprocessContent(content: string): string {
    // Sanitize and clean content
    let processed = validateInput.sanitizeText(content);
    
    // Remove excessive whitespace
    processed = processed.replace(/\s+/g, ' ').trim();
    
    // Limit length
    if (processed.length > this.policy.maxLength) {
      processed = processed.substring(0, this.policy.maxLength);
      this.logger.warn('Content truncated due to length limit', {
        originalLength: content.length,
        truncatedLength: processed.length
      });
    }
    
    return processed;
  }

  /**
   * Check if content is biblical/theological appropriate.
   */
  async checkBiblicalAppropriateness(content: string): Promise<boolean> {
    const lowerContent = content.toLowerCase();
    
    // Check for inappropriate theological content
    const inappropriateTopics = [
      'prosperity gospel extremism',
      'date setting for end times',
      'denominational attacks',
      'false prophecy',
      'cult recruitment'
    ];

    for (const topic of inappropriateTopics) {
      if (lowerContent.includes(topic)) {
        this.logger.warn('Potentially inappropriate biblical content detected', {
          topic,
          contentPreview: content.substring(0, 100)
        });
        return false;
      }
    }

    return true;
  }
}