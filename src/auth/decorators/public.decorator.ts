import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route as publicly accessible without JWT.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator for public routes (health, login, docs helpers).
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
