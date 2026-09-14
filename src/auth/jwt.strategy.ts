import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectDataSource } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { AuthUser, JwtPayload } from './auth.types';

/**
 * Validates Bearer JWT access tokens.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  public constructor(
    configService: ConfigService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'keyloop-scheduler-dev-secret',
      ),
    });
  }

  /**
   * Loads the user referenced by the token subject.
   */
  public async validate(payload: JwtPayload): Promise<AuthUser> {
    const user: User | null = await this.dataSource.manager.findOneBy(User, {
      id: payload.sub,
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.fullName,
    };
  }
}
