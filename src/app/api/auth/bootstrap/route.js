import { requirePortalAuth } from '@/lib/middleware';
import { getRefreshTokenFromRequest, ok, SESSION_COOKIE_OPTIONS, signToken, verifyToken } from '@/lib/jwt';
import Department from '@/lib/models/Department';
import SystemConfig from '@/lib/models/SystemConfig';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import EmpProfile from '@/lib/models/EmploymentProfile';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    await connectDB();
    const globalConfig = await SystemConfig.findOne({ key: 'global_config' }).select('value').lean().catch(() => null);

    let { user, portalAccess, error } = await requirePortalAuth(req);
    let refreshedAccessToken = null;

    if (error) {
      const refreshToken = getRefreshTokenFromRequest(req);
      const decoded = refreshToken ? verifyToken(refreshToken) : null;
      if (decoded?.tokenType === 'refresh') {
        const refreshUser = await User.findById(decoded.id).select('-password');
        if (refreshUser) {
          if (refreshUser.status === 'active') {
            user = refreshUser;
            portalAccess = 'hrms';
          } else {
            const profile = refreshUser.profileId
              ? await EmpProfile.findById(refreshUser.profileId).select('employmentStatus')
              : refreshUser.identityId ? await EmpProfile.findOne({ identityId: refreshUser.identityId }).select('employmentStatus') : null;
            if (profile && ['resigned', 'terminated', 'retired', 'alumni'].includes(profile.employmentStatus)) {
              user = refreshUser;
              portalAccess = 'alumni';
            }
          }
          if (user) {
            refreshedAccessToken = signToken({ id: user._id, role: user.role, portalAccess });
          }
        }
      }
    }

    if (!user) {
      return ok({
        user: null,
        settings: globalConfig?.value || null,
      });
    }

    const department = user.department
      ? await Department.findOne({ name: user.department }).select('visibleDepartments').lean().catch(() => null)
      : null;

    const response = NextResponse.json({ success: true, data: {
      user: {
        ...user.toObject(),
        visibleDepartments: department?.visibleDepartments || [],
        portalAccess,
      },
      settings: globalConfig?.value || null,
    } });
    if (refreshedAccessToken) {
      response.cookies.set('hrms_access', refreshedAccessToken, { ...SESSION_COOKIE_OPTIONS, maxAge: 15 * 60 });
    }
    return response;
  } catch {
    return ok({
      user: null,
      settings: null,
    });
  }
}
