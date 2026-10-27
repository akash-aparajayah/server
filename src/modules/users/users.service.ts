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
import { Role } from '../../common/enums/role.enum.js';
import { S3Service } from '../uploads/s3.service.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly s3Service: S3Service,
  ) { }

  async create(dto: CreateUserDto) {
    const exists = await this.userModel.exists({
      email: dto.email.toLowerCase(),
    });
    if (exists) throw new ConflictException('Email already registered');

    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      password,
      role: dto.role ?? Role.USER,
    });
    const { password: _omit, ...safe } = user.toObject();
    return safe;
  }

  findAll() {
    return this.userModel
      .find({ isActive: true })
      .select('-password -refreshTokenHash')
      .exec();
  }

  async findOne(id: string) {
    const user = await this.userModel
      .findOne({ _id: id, isActive: true })
      .select('name email role isActive')
      .exec();

    if (!user) {
      throw new NotFoundException('Active user not found');
    }

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
      .findOneAndUpdate(
        { _id: id, isActive: true },
        { $set: dto },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .select('-password -refreshTokenHash')
      .exec();

    if (!user) {
      throw new NotFoundException('Active user not found');
    }

    return user;
  }

  async remove(id: string) {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          isActive: false,
          refreshTokenHash: null,
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      deleted: true,
      message: 'User deactivated successfully',
    };
  }

  async setRefreshToken(id: string, token: string | null) {
    await this.userModel
      .findByIdAndUpdate(id, { refreshTokenHash: token ? sha256(token) : null })
      .exec();
  }

  findByIdWithRefresh(id: string) {
    return this.userModel.findById(id).select('+refreshTokenHash').exec();
  }

  async updateProfileImage(userId: string, file: Express.Multer.File) {
    const previous = await this.userModel
      .findOne({ _id: userId, isActive: true })
      .select('profileImageKey')
      .exec();

    const uploaded = await this.s3Service.upload('users', file);

    const user = await this.userModel
      .findOneAndUpdate(
        { _id: userId, isActive: true },
        {
          $set: {
            profileImageKey: uploaded.key,
          },
        },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .select('-password -refreshTokenHash')
      .exec();

    if (!user) {
      await this.s3Service.delete(uploaded.key);
      throw new NotFoundException('Active user not found');
    }

    if (previous?.profileImageKey && previous.profileImageKey !== uploaded.key) {
      await this.s3Service.delete(previous.profileImageKey);
    }

    const cdnUrl = process.env.CDN_URL?.replace(/\/+$/, '');
    const fullUrl =
      cdnUrl && user.profileImageKey
        ? `${cdnUrl}/${user.profileImageKey}`
        : null;

    return {
      ...user.toObject(),
      profileImageKey: fullUrl ?? user.profileImageKey,
      profileImageUrl: fullUrl,
    };
  }
}
