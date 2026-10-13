import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Instance, InstanceDocument } from './schemas/instance.schema.js';
import { CreateInstanceDto } from './dto/create-instance.dto.js';
import { UpdateInstanceDto } from './dto/update-instance.dto.js';
import { Role } from '../../common/enums/role.enum.js';
import { Status } from '../../common/enums/status.enum.js';

export interface AuthUser {
  sub: string;
  role: Role;
}

@Injectable()
export class InstancesService {
  constructor(
    @InjectModel(Instance.name) private instanceModel: Model<InstanceDocument>,
  ) {}

  async create(dto: CreateInstanceDto, userId: string) {
    try {
      return await this.instanceModel.create({
        ...dto,
        createdBy: userId,
        updatedBy: userId,
      });
    } catch (e: any) {
      if (e.code === 11000) {
        throw new ConflictException('You already have an instance with this name');
      }
      throw e;
    }
  }

  findAll(user: AuthUser) {
    const filter = user.role === Role.ADMIN ? {} : { createdBy: user.sub };
    return this.instanceModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  // api-keys module idhaiyum use pannum (instance owner check ku)
  async findOne(id: string, user: AuthUser) {
    const instance = await this.instanceModel.findById(id).exec();
    if (!instance) throw new NotFoundException('Instance not found');

    const isOwner = instance.createdBy.toString() === user.sub;
    if (!isOwner && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Not your instance');
    }
    return instance;
  }

  async update(id: string, dto: UpdateInstanceDto, user: AuthUser) {
    const instance = await this.findOne(id, user); // owner check
    Object.assign(instance, dto, { updatedBy: user.sub });
    try {
      return await instance.save();
    } catch (e: any) {
      if (e.code === 11000) {
        throw new ConflictException('You already have an instance with this name');
      }
      throw e;
    }
  }

  async remove(id: string, user: AuthUser) {
    const instance = await this.findOne(id, user); // owner check
    await instance.deleteOne();
    return { deleted: true };
  }

  // ApiKeysService.validate use pannum (owner check illa, key already verified)
  async findActiveById(id: string) {
    return this.instanceModel.findOne({ _id: id, status: Status.Active }).exec();
  }
}