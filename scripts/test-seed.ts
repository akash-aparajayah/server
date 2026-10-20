import 'dotenv/config';

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Role } from '../src/common/enums/role.enum.js';

async function main() {
  console.log('[SEED] Script started');

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MONGODB_URI not found in .env. Check src/config/database.config.ts for the actual environment variable name.',
    );
  }

  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      'ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env',
    );
  }

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  }

  try {
    await mongoose.connect(uri);
    console.log('[SEED] MongoDB connected');

    const userSchema = new mongoose.Schema(
      {
        name: { type: String, required: true, trim: true },
        email: {
          type: String,
          required: true,
          unique: true,
          lowercase: true,
          trim: true,
        },
        password: { type: String, required: true, select: false },
        role: {
          type: String,
          enum: Object.values(Role),
          default: Role.USER,
        },
        isActive: { type: Boolean, default: true },
      },
      { timestamps: true, collection: 'users' },
    );

    const User =
      mongoose.models.SeedAdminUser ||
      mongoose.model('SeedAdminUser', userSchema);

    const existing = await User.findOne({ email }).exec();

    if (existing) {
      if (existing.get('role') === Role.ADMIN) {
        console.log('[SEED] Admin already exists; no changes made.');
        return;
      }

      throw new Error(
        'Email already belongs to a non-admin account. Choose another ADMIN_EMAIL.',
      );
    }

    await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role: Role.ADMIN,
      isActive: true,
    });

    console.log('[SEED] Admin created successfully:', email);
  } finally {
    await mongoose.disconnect();
    console.log('[SEED] MongoDB disconnected');
  }
}

main().catch((error: unknown) => {
  console.error(
    '[SEED] Failed:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
