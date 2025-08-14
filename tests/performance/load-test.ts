import autocannon from 'autocannon';
import { TestHelpers } from '@test-utils/test-helpers';

interface LoadTestConfig {
  url: string;
  connections?: number;
  duration?: number;
  pipelining?: number;
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

interface PerformanceThresholds {
  avgLatency: number;
  maxLatency: number;
  minThroughput: number;
  errorRate: number;
}

export class LoadTester {
  private baseUrl: string;
  private authToken?: string;

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async authenticate(token: string) {
    this.authToken = token;
  }

  async runLoadTest(config: LoadTestConfig): Promise<any> {
    const instance = autocannon({
      url: `${this.baseUrl}${config.url}`,
      connections: config.connections || 10,
      duration: config.duration || 30,
      pipelining: config.pipelining || 1,
      method: config.method || 'GET',
      body: config.body ? JSON.stringify(config.body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
        ...config.headers
      }
    });

    return new Promise((resolve, reject) => {
      autocannon.track(instance, { renderProgressBar: false });
      
      instance.on('done', (result) => {
        resolve(this.processResults(result));
      });
      
      instance.on('error', reject);
    });
  }

  private processResults(result: any) {
    return {
      url: result.url,
      duration: result.duration,
      connections: result.connections,
      requests: {
        total: result.requests.total,
        average: result.requests.average,
        mean: result.requests.mean,
        stddev: result.requests.stddev,
        min: result.requests.min,
        max: result.requests.max,
        percentiles: result.requests.percentiles
      },
      latency: {
        average: result.latency.average,
        mean: result.latency.mean,
        stddev: result.latency.stddev,
        min: result.latency.min,
        max: result.latency.max,
        percentiles: result.latency.percentiles
      },
      throughput: {
        average: result.throughput.average,
        mean: result.throughput.mean,
        stddev: result.throughput.stddev,
        min: result.throughput.min,
        max: result.throughput.max,
        total: result.throughput.total
      },
      errors: result.errors,
      timeouts: result.timeouts,
      non2xx: result.non2xx,
      resets: result.resets
    };
  }

  assertPerformance(results: any, thresholds: PerformanceThresholds) {
    const errors = [];

    if (results.latency.average > thresholds.avgLatency) {
      errors.push(`Average latency ${results.latency.average}ms exceeds threshold ${thresholds.avgLatency}ms`);
    }

    if (results.latency.max > thresholds.maxLatency) {
      errors.push(`Max latency ${results.latency.max}ms exceeds threshold ${thresholds.maxLatency}ms`);
    }

    if (results.requests.average < thresholds.minThroughput) {
      errors.push(`Throughput ${results.requests.average} req/s below threshold ${thresholds.minThroughput} req/s`);
    }

    const errorRate = (results.errors + results.timeouts + results.non2xx) / results.requests.total;
    if (errorRate > thresholds.errorRate) {
      errors.push(`Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(thresholds.errorRate * 100).toFixed(2)}%`);
    }

    if (errors.length > 0) {
      throw new Error(`Performance thresholds not met:\n${errors.join('\n')}`);
    }
  }

  async runScenario(name: string, config: LoadTestConfig, thresholds: PerformanceThresholds) {
    console.log(`\n🚀 Running load test scenario: ${name}`);
    console.log(`   URL: ${config.url}`);
    console.log(`   Duration: ${config.duration}s`);
    console.log(`   Connections: ${config.connections}`);

    const results = await this.runLoadTest(config);

    console.log(`\n📊 Results:`);
    console.log(`   Total requests: ${results.requests.total}`);
    console.log(`   Avg throughput: ${results.requests.average} req/s`);
    console.log(`   Avg latency: ${results.latency.average}ms`);
    console.log(`   Max latency: ${results.latency.max}ms`);
    console.log(`   Errors: ${results.errors}`);
    console.log(`   Timeouts: ${results.timeouts}`);

    this.assertPerformance(results, thresholds);
    
    console.log(`   ✅ Performance thresholds met!`);
    return results;
  }
}

// Predefined test scenarios
export const scenarios = {
  lightLoad: {
    config: {
      connections: 10,
      duration: 30,
      pipelining: 1
    },
    thresholds: {
      avgLatency: 100,
      maxLatency: 1000,
      minThroughput: 100,
      errorRate: 0.01
    }
  },

  normalLoad: {
    config: {
      connections: 50,
      duration: 60,
      pipelining: 1
    },
    thresholds: {
      avgLatency: 200,
      maxLatency: 2000,
      minThroughput: 50,
      errorRate: 0.02
    }
  },

  heavyLoad: {
    config: {
      connections: 100,
      duration: 60,
      pipelining: 1
    },
    thresholds: {
      avgLatency: 500,
      maxLatency: 5000,
      minThroughput: 20,
      errorRate: 0.05
    }
  },

  stressTest: {
    config: {
      connections: 200,
      duration: 120,
      pipelining: 10
    },
    thresholds: {
      avgLatency: 1000,
      maxLatency: 10000,
      minThroughput: 10,
      errorRate: 0.1
    }
  },

  spikeTest: {
    config: {
      connections: 500,
      duration: 30,
      pipelining: 1
    },
    thresholds: {
      avgLatency: 2000,
      maxLatency: 20000,
      minThroughput: 5,
      errorRate: 0.2
    }
  }
};