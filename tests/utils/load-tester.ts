import autocannon from 'autocannon';
import { ApiClient } from './api-client';

export interface LoadTestOptions {
  url: string;
  connections?: number;
  pipelining?: number;
  duration?: number;
  requests?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  title?: string;
}

export interface LoadTestResult {
  title: string;
  url: string;
  connections: number;
  pipelining: number;
  duration: number;
  requests: {
    total: number;
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    p0_001: number;
    p0_01: number;
    p0_1: number;
    p1: number;
    p2_5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p97_5: number;
    p99: number;
    p99_9: number;
    p99_99: number;
    p99_999: number;
    sent: number;
  };
  latency: {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    p0_001: number;
    p0_01: number;
    p0_1: number;
    p1: number;
    p2_5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p97_5: number;
    p99: number;
    p99_9: number;
    p99_99: number;
    p99_999: number;
  };
  throughput: {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    total: number;
  };
  errors: number;
  timeouts: number;
  mismatches: number;
  start: Date;
  finish: Date;
}

export interface PerformanceBenchmarks {
  responseTime: {
    p95: number; // 95th percentile response time (ms)
    p99: number; // 99th percentile response time (ms)
    average: number; // Average response time (ms)
  };
  throughput: {
    minimum: number; // Minimum requests per second
    target: number; // Target requests per second
  };
  errorRate: {
    maximum: number; // Maximum acceptable error rate (percentage)
  };
  concurrent: {
    users: number; // Number of concurrent users to simulate
    connections: number; // Number of concurrent connections
  };
}

export class LoadTester {
  private readonly baseUrl: string;
  private readonly defaultOptions: Partial<LoadTestOptions>;
  private readonly benchmarks: PerformanceBenchmarks;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.defaultOptions = {
      connections: 10,
      pipelining: 1,
      duration: 30, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    this.benchmarks = {
      responseTime: {
        p95: 500, // 95th percentile should be under 500ms
        p99: 1000, // 99th percentile should be under 1000ms
        average: 200 // Average should be under 200ms
      },
      throughput: {
        minimum: 50, // At least 50 requests per second
        target: 100 // Target 100 requests per second
      },
      errorRate: {
        maximum: 1 // Maximum 1% error rate
      },
      concurrent: {
        users: 50, // Simulate 50 concurrent users
        connections: 10 // Use 10 connections
      }
    };
  }

  async runLoadTest(options: LoadTestOptions): Promise<LoadTestResult> {
    const testOptions = {
      ...this.defaultOptions,
      ...options,
      url: options.url.startsWith('http') ? options.url : `${this.baseUrl}${options.url}`
    };

    try {
      const result = await autocannon({
        url: testOptions.url,
        connections: testOptions.connections,
        pipelining: testOptions.pipelining,
        duration: testOptions.duration,
        requests: testOptions.requests,
        method: testOptions.method as any,
        headers: testOptions.headers,
        body: testOptions.body,
        title: testOptions.title || `Load test for ${testOptions.url}`
      });

      return {
        title: result.title,
        url: result.url,
        connections: result.connections,
        pipelining: result.pipelining,
        duration: result.duration,
        requests: {
          total: result.requests.total,
          average: result.requests.average,
          mean: result.requests.mean,
          stddev: result.requests.stddev,
          min: result.requests.min,
          max: result.requests.max,
          p0_001: result.requests.p0_001,
          p0_01: result.requests.p0_01,
          p0_1: result.requests.p0_1,
          p1: result.requests.p1,
          p2_5: result.requests.p2_5,
          p10: result.requests.p10,
          p25: result.requests.p25,
          p50: result.requests.p50,
          p75: result.requests.p75,
          p90: result.requests.p90,
          p97_5: result.requests.p97_5,
          p99: result.requests.p99,
          p99_9: result.requests.p99_9,
          p99_99: result.requests.p99_99,
          p99_999: result.requests.p99_999,
          sent: result.requests.sent
        },
        latency: {
          average: result.latency.average,
          mean: result.latency.mean,
          stddev: result.latency.stddev,
          min: result.latency.min,
          max: result.latency.max,
          p0_001: result.latency.p0_001,
          p0_01: result.latency.p0_01,
          p0_1: result.latency.p0_1,
          p1: result.latency.p1,
          p2_5: result.latency.p2_5,
          p10: result.latency.p10,
          p25: result.latency.p25,
          p50: result.latency.p50,
          p75: result.latency.p75,
          p90: result.latency.p90,
          p97_5: result.latency.p97_5,
          p99: result.latency.p99,
          p99_9: result.latency.p99_9,
          p99_99: result.latency.p99_99,
          p99_999: result.latency.p99_999
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
        mismatches: result.mismatches,
        start: result.start,
        finish: result.finish
      };
    } catch (error) {
      throw new Error(`Load test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async runAuthenticatedLoadTest(
    endpoint: string, 
    method: string = 'GET', 
    body?: any,
    overrideOptions?: Partial<LoadTestOptions>
  ): Promise<LoadTestResult> {
    // Get auth token for load testing
    const apiClient = new ApiClient();
    const authResponse = await apiClient.post('/auth/login', {
      email: 'loadtest@example.com',
      password: 'LoadTest123!'
    });

    const token = authResponse.data.token;

    return this.runLoadTest({
      url: endpoint,
      method,
      headers: {
        ...this.defaultOptions.headers,
        'Authorization': `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined,
      title: `Authenticated ${method} ${endpoint}`,
      ...overrideOptions
    });
  }

  validateBenchmarks(result: LoadTestResult): {
    passed: boolean;
    failures: string[];
    metrics: {
      responseTime: boolean;
      throughput: boolean;
      errorRate: boolean;
    };
  } {
    const failures: string[] = [];
    const metrics = {
      responseTime: true,
      throughput: true,
      errorRate: true
    };

    // Check response time benchmarks
    if (result.latency.p99 > this.benchmarks.responseTime.p99) {
      failures.push(`P99 response time ${result.latency.p99}ms exceeds benchmark ${this.benchmarks.responseTime.p99}ms`);
      metrics.responseTime = false;
    }

    if (result.latency.p97_5 > this.benchmarks.responseTime.p95) {
      failures.push(`P95 response time ${result.latency.p97_5}ms exceeds benchmark ${this.benchmarks.responseTime.p95}ms`);
      metrics.responseTime = false;
    }

    if (result.latency.average > this.benchmarks.responseTime.average) {
      failures.push(`Average response time ${result.latency.average}ms exceeds benchmark ${this.benchmarks.responseTime.average}ms`);
      metrics.responseTime = false;
    }

    // Check throughput benchmarks
    const actualThroughput = result.requests.average;
    if (actualThroughput < this.benchmarks.throughput.minimum) {
      failures.push(`Throughput ${actualThroughput} req/s is below minimum ${this.benchmarks.throughput.minimum} req/s`);
      metrics.throughput = false;
    }

    // Check error rate
    const errorRate = (result.errors / result.requests.total) * 100;
    if (errorRate > this.benchmarks.errorRate.maximum) {
      failures.push(`Error rate ${errorRate.toFixed(2)}% exceeds maximum ${this.benchmarks.errorRate.maximum}%`);
      metrics.errorRate = false;
    }

    return {
      passed: failures.length === 0,
      failures,
      metrics
    };
  }

  getBenchmarks(): PerformanceBenchmarks {
    return { ...this.benchmarks };
  }

  updateBenchmarks(newBenchmarks: Partial<PerformanceBenchmarks>): void {
    Object.assign(this.benchmarks, newBenchmarks);
  }

  async runStandardBenchmarks(): Promise<{
    healthCheck: LoadTestResult;
    apiEndpoints: LoadTestResult[];
    validation: ReturnType<LoadTester['validateBenchmarks']>[];
  }> {
    const results = {
      healthCheck: await this.runLoadTest({
        url: '/health',
        title: 'Health Check Endpoint',
        duration: 10,
        connections: 5
      }),
      apiEndpoints: [] as LoadTestResult[],
      validation: [] as ReturnType<LoadTester['validateBenchmarks']>[]
    };

    // Test common API endpoints
    const endpoints = [
      { url: '/api/books', method: 'GET', title: 'List Books' },
      { url: '/api/users/profile', method: 'GET', title: 'User Profile', auth: true }
    ];

    for (const endpoint of endpoints) {
      try {
        const result = endpoint.auth
          ? await this.runAuthenticatedLoadTest(endpoint.url, endpoint.method, undefined, {
              title: endpoint.title,
              duration: 15,
              connections: this.benchmarks.concurrent.connections
            })
          : await this.runLoadTest({
              url: endpoint.url,
              method: endpoint.method,
              title: endpoint.title,
              duration: 15,
              connections: this.benchmarks.concurrent.connections
            });

        results.apiEndpoints.push(result);
        results.validation.push(this.validateBenchmarks(result));
      } catch (error) {
        console.warn(`Skipping performance test for ${endpoint.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  generateReport(
    results: LoadTestResult[], 
    validations: ReturnType<LoadTester['validateBenchmarks']>[]
  ): string {
    let report = '# Performance Test Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Summary
    const totalTests = results.length;
    const passedTests = validations.filter(v => v.passed).length;
    const failedTests = totalTests - passedTests;

    report += `## Summary\n`;
    report += `- **Total Tests:** ${totalTests}\n`;
    report += `- **Passed:** ${passedTests}\n`;
    report += `- **Failed:** ${failedTests}\n`;
    report += `- **Success Rate:** ${((passedTests / totalTests) * 100).toFixed(1)}%\n\n`;

    // Detailed Results
    report += `## Test Results\n\n`;

    results.forEach((result, index) => {
      const validation = validations[index];
      const status = validation.passed ? '✅' : '❌';

      report += `### ${status} ${result.title}\n`;
      report += `- **URL:** ${result.url}\n`;
      report += `- **Duration:** ${result.duration}s\n`;
      report += `- **Connections:** ${result.connections}\n`;
      report += `- **Total Requests:** ${result.requests.total.toLocaleString()}\n`;
      report += `- **Requests/sec:** ${result.requests.average.toFixed(2)}\n`;
      report += `- **Average Latency:** ${result.latency.average.toFixed(2)}ms\n`;
      report += `- **P95 Latency:** ${result.latency.p97_5.toFixed(2)}ms\n`;
      report += `- **P99 Latency:** ${result.latency.p99.toFixed(2)}ms\n`;
      report += `- **Errors:** ${result.errors}\n`;
      report += `- **Error Rate:** ${((result.errors / result.requests.total) * 100).toFixed(2)}%\n`;

      if (!validation.passed) {
        report += `\n**Issues:**\n`;
        validation.failures.forEach(failure => {
          report += `- ${failure}\n`;
        });
      }

      report += '\n';
    });

    // Benchmarks
    report += `## Performance Benchmarks\n\n`;
    report += `| Metric | Benchmark | Type |\n`;
    report += `|--------|-----------|------|\n`;
    report += `| P95 Response Time | < ${this.benchmarks.responseTime.p95}ms | Response Time |\n`;
    report += `| P99 Response Time | < ${this.benchmarks.responseTime.p99}ms | Response Time |\n`;
    report += `| Average Response Time | < ${this.benchmarks.responseTime.average}ms | Response Time |\n`;
    report += `| Minimum Throughput | > ${this.benchmarks.throughput.minimum} req/s | Throughput |\n`;
    report += `| Target Throughput | ${this.benchmarks.throughput.target} req/s | Throughput |\n`;
    report += `| Maximum Error Rate | < ${this.benchmarks.errorRate.maximum}% | Reliability |\n`;
    report += `| Concurrent Users | ${this.benchmarks.concurrent.users} | Load |\n`;
    report += `| Concurrent Connections | ${this.benchmarks.concurrent.connections} | Load |\n`;

    return report;
  }
}