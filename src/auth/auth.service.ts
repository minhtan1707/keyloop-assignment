import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './auth.types';

/**
 * Handles staff login and JWT issuance.
 */
@Injectable()
export class AuthService {
  public constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validates credentials and returns a Bearer access token.
   */
  public async login(input: LoginDto): Promise<{
    access_token: string;
    token_type: string;
    expires_in: string;
    user: {
      id: string;
      email: string;
      full_name: string;
      role: string;
    };
  }> {
    const user: User | null = await this.dataSource.manager.findOneBy(User, {
      email: input.email.toLowerCase(),
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isValidPassword: boolean = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      token_type: 'Bearer',
      expires_in: '8h',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
      },
    };
  }
}
