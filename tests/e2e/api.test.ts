// Mock environment variables for testing - MUST be set before imports
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5433/test_deeper_bible';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6380';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_ACCESS_TOKEN_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_TOKEN_SECRET = 'test_refresh_secret';
process.env.JWT_ACCESS_TOKEN_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.OPENAI_API_KEY = 'sk-test'; // Mock key for LLM service
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.OAUTH_CLIENT_ID = 'test-oauth-client-id';
process.env.OAUTH_CLIENT_SECRET = 'test-oauth-client-secret';
process.env.OAUTH_REDIRECT_URI = 'http://localhost:3000/auth/callback';

// Now import after environment variables are set
import request from 'supertest';
import app from '../../src/api/app'; // Reverted import
import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis'; // Import createClient and RedisClientType

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let server: any;
let accessToken: string;
let refreshToken: string;
let testRedisClient: RedisClientType; // Declare testRedisClient

beforeAll(async () => {
  // Initialize a new Redis client for testing
  testRedisClient = createClient({
    url: process.env.REDIS_URL,
  }) as RedisClientType;
  await testRedisClient.connect();

  // Ensure test database is clean
  await pool.query('DROP TABLE IF EXISTS user_bookmarks CASCADE;');
  await pool.query('DROP TABLE IF EXISTS passage_analyses CASCADE;');
  await pool.query('DROP TABLE IF EXISTS prompt_versions CASCADE;');
  await pool.query('DROP TABLE IF EXISTS user_usage CASCADE;');
  await pool.query('DROP TABLE IF EXISTS bible_verses CASCADE;');
  await pool.query('DROP TABLE IF EXISTS users CASCADE;');
  await pool.query(`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      encrypted_password VARCHAR(255),
      oauth_provider VARCHAR(50),
      oauth_id VARCHAR(255),
      subscription_tier VARCHAR(20) DEFAULT 'free',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE bible_verses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      book VARCHAR(50) NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      translation VARCHAR(10) NOT NULL DEFAULT 'KJV',
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE passage_analyses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      verse_range VARCHAR(200) NOT NULL,
      normalized_range VARCHAR(200) NOT NULL,
      prompt_version VARCHAR(50) NOT NULL,
      analysis_type VARCHAR(50) DEFAULT 'full_discovery',
      xml_content TEXT NOT NULL,
      content_summary TEXT,
      complexity_level VARCHAR(20),
      view_count INTEGER DEFAULT 0,
      user_rating FLOAT DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      last_accessed TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE user_bookmarks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      analysis_id UUID REFERENCES passage_analyses(id) ON DELETE CASCADE,
      personal_notes TEXT,
      tags TEXT[],
      bookmark_group VARCHAR(100),
      is_public BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE prompt_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      version_name VARCHAR(50) UNIQUE NOT NULL,
      prompt_type VARCHAR(50) NOT NULL,
      prompt_template TEXT NOT NULL,
      xml_schema TEXT,
      is_active BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE user_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      month_year VARCHAR(7) NOT NULL,
      analyses_used INTEGER DEFAULT 0,
      analyses_limit INTEGER DEFAULT 10,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, month_year)
    );
  `);

  // Clear Redis cache using the test client
  await testRedisClient.flushDb();

  // Start the Express server
  server = app.listen(4000); // Use a different port for testing
});

afterAll(async () => {
  // Close the Express server
  await server.close();
  // Close DB connection pool
  await pool.end();
  // Disconnect Redis client
  await testRedisClient.quit(); // Disconnect the test client
});

describe('User Authentication and Profile', () => {
  const userEmail = 'test@example.com';
  const userPassword = 'password123';

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: userEmail, password: userPassword });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message', 'User registered successfully');
  });

  it('should log in the registered user and return tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: userPassword });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('should get user profile with valid token', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('email', userEmail);
    expect(res.body).toHaveProperty('subscription_tier', 'free');
  });

  it('should update user profile', async () => {
    const newEmail = 'updated@example.com';
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: newEmail }); // Note: email update is currently blocked in controller

    expect(res.statusCode).toEqual(200);
    // Expect email to be unchanged due to controller logic
    expect(res.body).toHaveProperty('email', userEmail);
  });
});

describe('Verse Analysis', () => {
  it('should generate a new analysis for a verse', async () => {
    const res = await request(app)
      .post('/api/analysis')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ verse_range: 'John 3:16', translation: 'KJV' });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('verse_range', 'John 3:16');
    expect(res.body).toHaveProperty('cached', false);
    expect(res.body).toHaveProperty('parsed_analysis');
    expect(res.body.parsed_analysis).toHaveProperty('passage_overview');
  });

  it('should retrieve a cached analysis for the same verse', async () => {
    const res = await request(app)
      .post('/api/analysis')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ verse_range: 'John 3:16', translation: 'KJV' });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('verse_range', 'John 3:16');
    expect(res.body).toHaveProperty('cached', true); // Should be cached now
  });
});

describe('Symbol Highlighting', () => {
  it('should return symbols for highlighting in a given text', async () => {
    const text = 'The Lamb of God takes away the sin of the world.';
    const res = await request(app)
      .post('/api/symbols/highlight')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ text });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('term', 'Lamb');
    expect(res.body[0]).toHaveProperty('start');
    expect(res.body[0]).toHaveProperty('end');
  });
});

describe('Cleanup', () => {
  it('should delete the user account', async () => {
    const res = await request(app)
      .delete('/api/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(204);
  });
});