import { execSync } from 'child_process';

const setupDatabase = async (): Promise<void> => {
  try {
    console.log('Setting up test database...');
    
    // Set the test database URL
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    
    // Run migrations on test database
    execSync('npx prisma migrate dev', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL,
      },
    });
    
    // Seed test database
    execSync('npx prisma db seed', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL,
      },
    });
    
    console.log('Test database setup completed');
  } catch (error) {
    console.error('Test database setup failed:', error);
    throw error;
  }
};

export default setupDatabase;