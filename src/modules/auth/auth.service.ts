import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Role } from '../../common/enums/role.enum.js';
import { sha256 } from '../../common/utils/hash.util.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.users.create({ ...dto, role: Role.USER });
    return this.issueTokens(
      user._id.toString(),
      user.email,
      user.role,
      user.name,
    );
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    const valid =
      user &&
      user.isActive &&
      (await bcrypt.compare(dto.password, user.password));

    if (!valid) throw new UnauthorizedException('Invalid credentials');
    const token = await this.issueTokens(
      user._id.toString(),
      user.email,
      user.role,
      user.name,
    );
    let userData = {
      user_name: user._id.toString(),
      user_email: user.email,
      user_role: user.role,
      user_status: user.isActive,
    };
    return { userData, token };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.users.findByIdWithRefresh(payload.sub);
    if (
      !user ||
      !user.isActive ||
      !user.refreshTokenHash ||
      sha256(refreshToken) !== user.refreshTokenHash
    ) {
      throw new ForbiddenException('Access denied');
    }

    return this.issueTokens(
      user._id.toString(),
      user.email,
      user.role,
      user.name,
    );
  }

  async logout(userId: string) {
    await this.users.setRefreshToken(userId, null);
    return { success: true };
  }

  private async issueTokens(
    id: string,
    email: string,
    role: string,
    name: string,
  ) {
    const payload = {
      sub: id,
      email,
      role,
      name,
    };

    const [access_token, refresh_token] = await Promise.all([
      this.jwt.signAsync(payload),

      this.jwt.signAsync({ ...payload, jti: randomUUID() }, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      } as any),
    ]);

    await this.users.setRefreshToken(id, refresh_token);

    return { access_token, refresh_token };
  }
}
