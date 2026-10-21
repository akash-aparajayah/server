import 'dotenv/config';

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Role } from '../src/common/enums/role.enum.js';

export async function seedAdmin(): Promise<void> {
  try {
    console.log('[SEED] Starting admin seeder...');

    // 1. Read environment variables
    const uri = process.env.MONGODB_URI;
    const name = process.env.ADMIN_NAME?.trim();
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    // 2. Validate environment variables
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

    // 3. Connect to MongoDB
    await mongoose.connect(uri);
    console.log('[SEED] MongoDB connected successfully');

    // 4. Access the users collection
    const users = mongoose.connection.collection('users');

    // 5. Check whether the admin already exists
    const existingUser = await users.findOne({ email });

    if (existingUser) {
      if (existingUser.role === Role.ADMIN) {
        console.log('[SEED] Admin already exists; skipping creation.');
        return;
      }

      throw new Error(
        'This email belongs to a non-admin user. Choose another ADMIN_EMAIL.',
      );
    }

    // 6. Hash the admin password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 7. Insert the admin user
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
      '[SEED] Admin seeder failed:',
      error instanceof Error ? (error.stack ?? error.message) : error,
    );

    // Let the master seeder detect the failure
    throw error;
  } finally {
    // 8. Close the MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[SEED] MongoDB disconnected');
    }
  }
}
