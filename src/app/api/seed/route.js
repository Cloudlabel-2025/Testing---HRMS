import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { ok, fail } from '@/lib/jwt';

function getSubmittedSetupToken(req, body = {}) {
  return req.headers.get('x-setup-token') || body.setupToken || '';
}

export async function POST(req) {
  try {
    const expectedToken = process.env.SETUP_TOKEN;
    if (!expectedToken) {
      return fail('Seed route is disabled. Set SETUP_TOKEN only for controlled first-time setup.', 403);
    }

    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_SEED_ROUTE !== 'true') {
      return fail('Seed route is disabled in production', 403);
    }

    const body = await req.json().catch(() => ({}));
    if (getSubmittedSetupToken(req, body) !== expectedToken) {
      return fail('Invalid setup token', 403);
    }

    await dbConnect();

    const { SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;
    if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) return fail('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env.local', 400);

    const existing = await User.findOne({ role: 'super_admin' }).select('+password +loginAttempts +lockUntil');
    if (existing) {
      if (!body.resetSuperAdminPassword) return fail('Super admin already exists', 409);

      existing.name = existing.name || SEED_ADMIN_NAME || 'Super Admin';
      existing.email = SEED_ADMIN_EMAIL;
      existing.password = SEED_ADMIN_PASSWORD;
      existing.role = 'super_admin';
      existing.status = 'active';
      existing.loginAttempts = 0;
      existing.lockUntil = null;
      existing.isFirstLogin = false;
      await existing.save();

      return ok({ message: 'Super admin password reset', email: existing.email });
    }

    const admin = await User.create({
      name: SEED_ADMIN_NAME || 'Super Admin',
      email: SEED_ADMIN_EMAIL,
      password: SEED_ADMIN_PASSWORD,
      role: 'super_admin',
      status: 'active',
      isFirstLogin: false,
    });

    return ok({ message: 'Super admin created', email: admin.email }, 201);
  } catch (e) {
    return fail(e.message, 500);
  }
}
