process.env.NODE_ENV = 'test';
process.env.JWT_PRIVATE_KEY_PATH = process.env.JWT_PRIVATE_KEY_PATH || 'keys/private.pem';
process.env.JWT_PUBLIC_KEY_PATH = process.env.JWT_PUBLIC_KEY_PATH || 'keys/public.pem';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://nexus:nexus@localhost:5432/nexusauth';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
