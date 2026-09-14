import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';

/**
 * Authentication endpoints.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  /**
   * Exchanges email/password for a JWT access token.
   */
  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login and receive JWT' })
  public login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }
}
