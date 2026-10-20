import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // user registration
  @Public()
  @ResponseMessage('Registered successfully')
  @Post('user-register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // user login
  @Public()
  @ResponseMessage('Login successful')
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // refresh token
  @Public()
  @ResponseMessage('Token refreshed successfully')
  @Post('refresh-token')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  // user logout
  @ResponseMessage('Logged out successfully')
  @Post('logout')
  logout(@CurrentUser() user: any) {
    return this.auth.logout(user.sub);
  }

  // current user (from token)
  @ResponseMessage('User fetched successfully')
  @Get('me')
  me(@CurrentUser() user: any) {


    return {
      id: user.sub,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
