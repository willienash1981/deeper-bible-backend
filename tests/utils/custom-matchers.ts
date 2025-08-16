// Custom Jest matchers for enhanced testing capabilities

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toHaveStatus(status: number): R;
      toContainObject(argument: object): R;
      toBeValidEmail(): R;
      toBeValidUUID(): R;
      toBeValidDate(): R;
      toHaveRequiredProperties(properties: string[]): R;
      toMatchApiResponse(): R;
      toBeValidBibleReference(): R;
    }
  }
}

export const customMatchers = {
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveStatus(received: any, status: number) {
    const pass = received.status === status;
    if (pass) {
      return {
        message: () => `expected response not to have status ${status}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response to have status ${status}, but got ${received.status}`,
        pass: false,
      };
    }
  },

  toContainObject(received: any[], argument: Record<string, any>) {
    const pass = received.some((item: Record<string, any>) => 
      Object.keys(argument).every(key => item[key] === argument[key])
    );
    if (pass) {
      return {
        message: () => `expected array not to contain object matching ${JSON.stringify(argument)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected array to contain object matching ${JSON.stringify(argument)}`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },

  toHaveRequiredProperties(received: object, properties: string[]) {
    const missingProps = properties.filter(prop => !(prop in received));
    const pass = missingProps.length === 0;
    if (pass) {
      return {
        message: () => `expected object not to have all required properties ${properties.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected object to have required properties ${properties.join(', ')}, but missing: ${missingProps.join(', ')}`,
        pass: false,
      };
    }
  },

  toMatchApiResponse(received: any) {
    const requiredProps = ['success'];
    const hasSuccess = 'success' in received;
    const hasCorrectStructure = received.success 
      ? ('data' in received) 
      : ('error' in received);
    
    const pass = hasSuccess && hasCorrectStructure;
    if (pass) {
      return {
        message: () => `expected object not to match API response structure`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected object to match API response structure (success + data/error)`,
        pass: false,
      };
    }
  },

  toBeValidBibleReference(received: string) {
    // Matches formats like "Genesis 1:1", "John 3:16", "Psalms 23:1-6"
    const bibleRefRegex = /^[1-3]?\s?[A-Za-z]+\s+\d+:\d+(-\d+)?$/;
    const pass = bibleRefRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Bible reference`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Bible reference (e.g., "Genesis 1:1")`,
        pass: false,
      };
    }
  }
};