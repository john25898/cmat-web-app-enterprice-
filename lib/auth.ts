import usersData from "@/data/users.json";

export type UserRole =
  | "cmat_officer"
  | "cmat_supervisor"
  | "story_teller"
  | "story_supervisor"
  | "staff"
  | "facility_incharge"
  | "county_rep"
  | "program_hr";

export interface AuthUser {
  email: string;
  name: string;
  role: UserRole;
  facility: string;
  county: string;
  jobTitle: string;
  phone: string;
  idNumber?: string;
}

interface CredentialUser {
  email: string;
  password: string;
  role: string;
  name: string;
  facility: string;
  county: string;
  jobTitle: string;
  phone: string;
  idNumber?: string;
}

const USERS = usersData as unknown as Record<string, CredentialUser>;

/** Roles that require real credentials from the employee roster. */
export const SECURED_ROLES: UserRole[] = [
  "staff",
  "facility_incharge",
  "county_rep",
  "program_hr",
];

/** Roles that remain demo/legacy (any email accepted). */
export const LEGACY_ROLES: UserRole[] = [
  "cmat_officer",
  "cmat_supervisor",
  "story_teller",
  "story_supervisor",
];

/**
 * Validates username/email + password against the generated credential list.
 * Returns the authenticated user (with real role/facility/county) or null.
 */
export function authenticate(email: string, password: string): AuthUser | null {
  const key = email.trim().toLowerCase();
  const user = USERS[key];
  if (!user || user.password !== password) return null;
  return toAuthUser(user);
}

/** Looks up a user record by email without a password check. */
export function findUserByEmail(email: string): AuthUser | null {
  const key = email.trim().toLowerCase();
  const user = USERS[key];
  return user ? toAuthUser(user) : null;
}

/** Total number of accounts (used for a small hint on the login screen). */
export const ACCOUNT_COUNT = Object.keys(USERS).length;

function toAuthUser(user: CredentialUser): AuthUser {
  return {
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    facility: user.facility || "",
    county: user.county || "",
    jobTitle: user.jobTitle || "",
    phone: user.phone || "",
    idNumber: user.idNumber,
  };
}
