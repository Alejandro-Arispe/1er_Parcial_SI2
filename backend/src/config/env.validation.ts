import Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().trim().default('api/v1'),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  DATABASE_POOL_MAX: Joi.number().integer().min(1).default(10),
  DATABASE_IDLE_TIMEOUT_MS: Joi.number().integer().min(0).default(30000),
  DATABASE_CONNECTION_TIMEOUT_MS: Joi.number().integer().min(1).default(5000),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  PASSWORD_SALT_ROUNDS: Joi.number().integer().min(10).max(14).default(12),
  SEED_ADMIN_EMAIL: Joi.string().email().optional(),
  SEED_ADMIN_PASSWORD: Joi.string().min(8).max(72).optional(),
}).unknown(true);

export const validateEnvironment = (
  config: Record<string, unknown>,
): Record<string, unknown> => {
  const { error, value } = environmentValidationSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }

  return value as Record<string, unknown>;
};
