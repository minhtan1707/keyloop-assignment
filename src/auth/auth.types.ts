/**
 * JWT payload carried in access tokens.
 */
export type JwtPayload = {
  readonly sub: string;
  readonly email: string;
  readonly role: string;
};

/**
 * Authenticated user attached to the request.
 */
export type AuthUser = {
  readonly id: string;
  readonly email: string;
  readonly role: string;
  readonly full_name: string;
};
