import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/securechat',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  argon2: {
    memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10), // 64 MB
    timeCost: parseInt(process.env.ARGON2_TIME_COST || '3', 10),
    parallelism: parseInt(process.env.ARGON2_PARALLELISM || '4', 10),
  },
};
