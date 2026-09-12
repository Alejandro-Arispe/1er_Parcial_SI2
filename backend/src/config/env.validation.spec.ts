import { validateEnvironment } from './env.validation.js';

describe('validateEnvironment', () => {
  const validEnvironment = {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/fashion_store',
    JWT_SECRET: 'a-secure-test-secret-with-32-characters',
  };

  it('applies safe defaults to a valid environment', () => {
    const result = validateEnvironment(validEnvironment);

    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.API_PREFIX).toBe('api/v1');
    expect(result.DATABASE_POOL_MAX).toBe(10);
  });

  it('rejects missing required values', () => {
    expect(() => validateEnvironment({})).toThrow(
      'Environment validation failed',
    );
  });

  it('rejects unsupported database protocols', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        DATABASE_URL: 'mysql://localhost/fashion_store',
      }),
    ).toThrow('Environment validation failed');
  });
});
