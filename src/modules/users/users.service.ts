import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { sha256 } from '../../common/utils/hash.util.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(dto: CreateUserDto) {
    const exists = await this.userModel.exists({
      email: dto.email.toLowerCase(),
    });
    if (exists) throw new ConflictException('Email already registered');

    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({ ...dto, password });

    const { password: _omit, ...safe } = user.toObject();
    return safe;
  }

  findAll() {
    return this.userModel.find().exec();
  }

  async findOne(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // used later by auth: includes the password hash
  findByEmail(email: string) {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password')
      .exec();
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.userModel
      .findByIdAndUpdate(id, dto, { returnDocument: 'after', })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: string) {
    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return { deleted: true };
  }

  async setRefreshToken(id: string, token: string | null) {
    await this.userModel
      .findByIdAndUpdate(id, { refreshTokenHash: token ? sha256(token) : null })
      .exec();
  }

  findByIdWithRefresh(id: string) {
    return this.userModel.findById(id).select('+refreshTokenHash').exec();
  }
}
