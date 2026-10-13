import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  //user registration
  @Public()
  @Post('user-register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  //user login
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  //refresh token
  @Public()
  @Post('refresh-token')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  //user logout
  @Post('logout')
  logout(@CurrentUser() user: any) {
    return this.auth.logout(user.sub);
  }

  //get user
  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }
}
