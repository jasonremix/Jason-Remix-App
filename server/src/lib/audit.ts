import { db } from '../db/index.ts';
import { newId } from './crypto.ts';

/**
 * Audit log for administrative actions.
 *
 * Anything an admin does that changes a member's standing — credits, bans, draws,
 * catalogue edits — is recorded with who did it and what it targeted. The log is
 * append-only; there is no update or delete path anywhere in the codebase.
 */
export function recordAdminAction(input: {
  adminId: string;
  adminEmail: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}): void {
  db.prepare(
    `INSERT INTO admin_action_log (id, admin_id, admin_email, action, target_type, target_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    newId(),
    input.adminId,
    input.adminEmail,
    input.action,
    input.targetType ?? null,
    input.targetId ?? null,
    input.metadata ? JSON.stringify(input.metadata) : null,
  );
}
