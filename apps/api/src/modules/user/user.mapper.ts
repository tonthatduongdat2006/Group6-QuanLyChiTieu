export interface PublicUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

/** Không bao giờ trả password_hash (API v1.1 §2). */
export function toPublicUser(u: { id: string; fullName: string; email: string; phone: string | null }): PublicUser {
  return { id: u.id, full_name: u.fullName, email: u.email, phone: u.phone };
}
