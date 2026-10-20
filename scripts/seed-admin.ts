import 'dotenv/config';

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

declare const process: {
  env: Record<string, string | undefined>;
  exitCode?: number;
};

import { Role } from '../src/common/enums/role.enum.js';

console.log('[SEED] Script file loaded');

async function seedAdmin(): Promise<void> {
  try {
    console.log('[SEED] Starting admin seeder...');

    const uri = process.env.MONGODB_URI;
    const name = process.env.ADMIN_NAME?.trim();
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!uri) {
      throw new Error('MONGODB_URI is missing from .env');
    }

    if (!name || !email || !password) {
      throw new Error(
        'ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD are required in .env',
      );
    }

    if (password.length < 12) {
      throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
    }

    await mongoose.connect(uri);
    console.log('[SEED] MongoDB connected');

    // Use the existing MongoDB "users" collection.
    const users = mongoose.connection.collection('users');

    const existingUser = await users.findOne({ email });

    if (existingUser) {
      if (existingUser.role === Role.ADMIN) {
        console.log('[SEED] Admin already exists; no changes made.');
        return;
      }

      throw new Error(
        'This email belongs to a non-admin user. Choose another ADMIN_EMAIL.',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await users.insertOne({
      name,
      email,
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('[SEED] Admin created successfully');
    console.log(`[SEED] Email: ${email}`);
  } catch (error: unknown) {
    console.error(
      '[SEED] Failed:',
      error instanceof Error ? (error.stack ?? error.message) : error,
    );

    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[SEED] MongoDB disconnected');
    }
  }
}

void seedAdmin();
