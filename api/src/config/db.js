import mongoose from 'mongoose';
import { env } from './env.js';

/** Strict queries stop a typo in a filter key from silently returning everything. */
mongoose.set('strictQuery', true);

export const connectDatabase = async () => {
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 8000,
  });
  return mongoose.connection;
};

export const disconnectDatabase = () => mongoose.disconnect();
