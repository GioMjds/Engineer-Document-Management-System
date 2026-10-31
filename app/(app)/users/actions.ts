'use server';

import {
  inviteUser as adminInviteUser,
  updateUser as adminUpdateUser,
  updateUserRole as adminUpdateUserRole,
  deactivateUser as adminDeactivateUser,
  resendUserInvite as adminResendUserInvite,
  type UpdateUserInput,
} from '@/app/actions/admin';
import type { AppRole } from '@/lib/permissions';

export async function inviteUser(input: {
  email: string;
  full_name: string;
  role: AppRole;
}) {
  return adminInviteUser(input);
}

export async function updateUser(input: UpdateUserInput) {
  return adminUpdateUser(input);
}

export async function updateUserRole(input: {
  user_id: string;
  role: AppRole;
}) {
  return adminUpdateUserRole(input);
}

export async function deactivateUser(userId: string) {
  return adminDeactivateUser(userId);
}

export async function resendUserInvite(email: string) {
  return adminResendUserInvite(email);
}
