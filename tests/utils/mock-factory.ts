import { faker } from '@faker-js/faker';

export class MockFactory {
  // User mocks
  static createUser(overrides = {}) {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      username: faker.internet.username(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: 'user',
      isActive: true,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides
    };
  }

  // Analysis mocks
  static createAnalysis(overrides = {}) {
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      book: 'Genesis',
      chapter: faker.number.int({ min: 1, max: 50 }),
      verses: '1-5',
      analysisType: faker.helpers.arrayElement(['theological', 'historical', 'symbolic']),
      content: {
        summary: faker.lorem.paragraph(),
        themes: faker.lorem.words(5).split(' '),
        symbols: faker.lorem.words(3).split(' '),
        confidence: faker.number.float({ min: 0.7, max: 1.0, fractionDigits: 2 })
      },
      metadata: {
        model: 'gpt-4',
        tokens: faker.number.int({ min: 100, max: 5000 }),
        cost: faker.number.float({ min: 0.01, max: 1.0, fractionDigits: 3 })
      },
      createdAt: faker.date.past(),
      ...overrides
    };
  }

  // Symbol mocks
  static createSymbol(overrides = {}) {
    return {
      id: faker.string.uuid(),
      name: faker.word.noun(),
      category: faker.helpers.arrayElement(['object', 'number', 'color', 'animal', 'nature']),
      meanings: [
        {
          context: faker.lorem.sentence(),
          interpretation: faker.lorem.paragraph(),
          references: [`${faker.helpers.arrayElement(['Genesis', 'Exodus', 'Psalms'])} ${faker.number.int({ min: 1, max: 150 })}:${faker.number.int({ min: 1, max: 30 })}`]
        }
      ],
      frequency: faker.number.int({ min: 1, max: 100 }),
      relatedSymbols: [faker.word.noun(), faker.word.noun()],
      ...overrides
    };
  }

  // API Response mocks
  static createApiResponse(data: any, overrides = {}) {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        ...overrides
      }
    };
  }

  static createApiError(message: string, code = 400, overrides = {}) {
    return {
      success: false,
      error: {
        message,
        code,
        timestamp: new Date().toISOString(),
        ...overrides
      }
    };
  }

  // Bible verse mocks
  static createVerse(overrides = {}) {
    return {
      book: faker.helpers.arrayElement(['Genesis', 'Exodus', 'Psalms', 'Matthew', 'John']),
      chapter: faker.number.int({ min: 1, max: 150 }),
      verse: faker.number.int({ min: 1, max: 30 }),
      text: faker.lorem.sentence(),
      translation: 'KJV',
      ...overrides
    };
  }

  // Cross reference mocks
  static createCrossReference(overrides = {}) {
    return {
      id: faker.string.uuid(),
      sourceVerse: `${faker.helpers.arrayElement(['Genesis', 'Exodus'])} ${faker.number.int({ min: 1, max: 50 })}:${faker.number.int({ min: 1, max: 30 })}`,
      targetVerse: `${faker.helpers.arrayElement(['Matthew', 'John'])} ${faker.number.int({ min: 1, max: 28 })}:${faker.number.int({ min: 1, max: 30 })}`,
      type: faker.helpers.arrayElement(['quotation', 'allusion', 'parallel', 'typology']),
      confidence: faker.number.float({ min: 0.5, max: 1.0, fractionDigits: 2 }),
      explanation: faker.lorem.paragraph(),
      ...overrides
    };
  }

  // OpenAI response mocks
  static createOpenAIResponse(overrides = {}) {
    return {
      id: faker.string.uuid(),
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: faker.lorem.paragraphs(2)
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: faker.number.int({ min: 100, max: 1000 }),
        completion_tokens: faker.number.int({ min: 100, max: 2000 }),
        total_tokens: faker.number.int({ min: 200, max: 3000 })
      },
      ...overrides
    };
  }

  // JWT token payload mock
  static createTokenPayload(overrides = {}) {
    return {
      userId: faker.string.uuid(),
      email: faker.internet.email(),
      role: 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...overrides
    };
  }

  // Prisma-compatible data generators
  static createBook(overrides = {}) {
    const bookNames = ['Genesis', 'Exodus', 'Psalms', 'Matthew', 'John', 'Romans'];
    const name = faker.helpers.arrayElement(bookNames);
    
    return {
      id: faker.string.uuid(),
      bookNumber: faker.number.int({ min: 1, max: 66 }),
      name,
      abbr: name.substring(0, 3).toUpperCase(),
      testament: faker.helpers.arrayElement(['OLD', 'NEW']),
      chapterCount: faker.number.int({ min: 1, max: 150 }),
      bookOrder: faker.number.int({ min: 1, max: 66 }),
      description: faker.lorem.sentence(),
      author: faker.person.fullName(),
      dateWritten: `${faker.number.int({ min: 1000, max: 100 })} BC`,
      ...overrides
    };
  }

  static createReport(overrides = {}) {
    return {
      id: faker.string.uuid(),
      bookId: faker.string.uuid(),
      chapter: faker.number.int({ min: 1, max: 50 }),
      verseStart: faker.number.int({ min: 1, max: 30 }),
      verseEnd: faker.number.int({ min: 1, max: 30 }),
      reportType: faker.helpers.arrayElement(['DEEPER_ANALYSIS', 'HISTORICAL_CONTEXT', 'SYMBOLIC_PATTERNS']),
      status: faker.helpers.arrayElement(['PENDING', 'COMPLETED', 'CACHED']),
      content: {
        summary: faker.lorem.paragraph(),
        themes: faker.lorem.words(5).split(' '),
        symbols: faker.lorem.words(3).split(' ')
      },
      userId: faker.string.uuid(),
      tokens: faker.number.int({ min: 100, max: 5000 }),
      cost: faker.number.float({ min: 0.01, max: 1.0, fractionDigits: 3 }),
      model: 'gpt-4',
      confidence: faker.number.float({ min: 0.7, max: 1.0, fractionDigits: 2 }),
      processingTime: faker.number.int({ min: 1000, max: 30000 }),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides
    };
  }

  static createSymbolPattern(overrides = {}) {
    return {
      id: faker.string.uuid(),
      symbol: faker.word.noun(),
      category: faker.helpers.arrayElement(['number', 'color', 'animal', 'object', 'nature']),
      meaning: faker.lorem.paragraph(),
      occurrences: faker.number.int({ min: 1, max: 100 }),
      contexts: [
        `Genesis ${faker.number.int({ min: 1, max: 50 })}:${faker.number.int({ min: 1, max: 30 })}`,
        `John ${faker.number.int({ min: 1, max: 21 })}:${faker.number.int({ min: 1, max: 30 })}`
      ],
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides
    };
  }

  // Database seed data
  static async createSeedData(count = 10) {
    const books = Array.from({ length: 5 }, () => this.createBook());
    const users = Array.from({ length: count }, () => this.createUser());
    const reports = Array.from({ length: count * 2 }, () => 
      this.createReport({ 
        userId: faker.helpers.arrayElement(users).id,
        bookId: faker.helpers.arrayElement(books).id
      })
    );
    const symbolPatterns = Array.from({ length: 20 }, () => this.createSymbolPattern());
    
    return {
      books,
      users,
      reports,
      symbolPatterns
    };
  }
}