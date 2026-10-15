import { Role } from '../enums/role.enum.js';

export interface AuthUser {
  sub: string;
  role: Role;
}