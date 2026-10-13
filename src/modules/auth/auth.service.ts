import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    const id = String(user._id);
    return { user, accessToken: this.sign(id, user.email, user.role) };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const id = user.id ?? String(user._id);
    return {
      accessToken: this.sign(id, user.email, user.role),
      user: { id, name: user.name, email: user.email, role: user.role },
    };
  }

  private sign(sub: string, email: string, role: string) {
    return this.jwtService.sign({ sub, email, role });
  }
}