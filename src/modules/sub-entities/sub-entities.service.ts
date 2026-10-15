import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubEntity, SubEntityDocument } from './schemas/sub-entity.schema.js';
import { CreateSubEntityDto } from './dto/create-sub-entity.dto.js';
import { UpdateSubEntityDto } from './dto/update-sub-entity.dto.js';
import { EntitiesService } from '../entities/entities.service.js';
import { AuthUser } from '../../common/interfaces/auth-user.interface.js';

@Injectable()
export class SubEntitiesService {
  constructor(
    @InjectModel(SubEntity.name) private subEntityModel: Model<SubEntityDocument>,
    private readonly entities: EntitiesService,
  ) {}

  async create(entityId: string, dto: CreateSubEntityDto, user: AuthUser) {
    await this.entities.findOne(entityId, user); // parent owner check (404 / 403)
    try {
      return await this.subEntityModel.create({
        ...dto,
        entity: entityId,
        createdBy: user.sub,
        updatedBy: user.sub,
      });
    } catch (e: any) {
      if (e.code === 11000) throw new ConflictException('This entity already has a sub entity with this name');
      throw e;
    }
  }

  async findAllByEntity(entityId: string, user: AuthUser) {
    await this.entities.findOne(entityId, user); // owner check
    return this.subEntityModel.find({ entity: entityId }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, user: AuthUser) {
    const sub = await this.subEntityModel.findById(id).exec();
    if (!sub) throw new NotFoundException('Sub entity not found');
    await this.entities.findOne(sub.entity.toString(), user); // parent owner check
    return sub;
  }

  async update(id: string, dto: UpdateSubEntityDto, user: AuthUser) {
    const sub = await this.findOne(id, user);
    Object.assign(sub, dto, { updatedBy: user.sub });
    try {
      return await sub.save();
    } catch (e: any) {
      if (e.code === 11000) throw new ConflictException('This entity already has a sub entity with this name');
      throw e;
    }
  }

  async remove(id: string, user: AuthUser) {
    const sub = await this.findOne(id, user);
    await sub.deleteOne();
    return { deleted: true };
  }
}