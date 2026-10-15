import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Entity, EntityDocument } from './schemas/entity.schema.js';
import {
  SubEntity,
  SubEntityDocument,
} from '../sub-entities/schemas/sub-entity.schema.js';
import { CreateEntityDto } from './dto/create-entity.dto.js';
import { UpdateEntityDto } from './dto/update-entity.dto.js';
import { Role } from '../../common/enums/role.enum.js';
import { AuthUser } from '../../common/interfaces/auth-user.interface.js';
import { Status } from '../../common/enums/status.enum.js';
import { ApiKey, ApiKeyDocument } from '../api-keys/schemas/api-key.schema.js';

@Injectable()
export class EntitiesService {
  constructor(
    @InjectModel(Entity.name) private entityModel: Model<EntityDocument>,
    @InjectModel(SubEntity.name)
    private subEntityModel: Model<SubEntityDocument>,
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKeyDocument>,
  ) {}

  // ApiKeysService.validate use pannum (owner check illa, key already verified)
  async findActiveById(id: string) {
    return this.entityModel.findOne({ _id: id, status: Status.Active }).exec();
  }
  async create(dto: CreateEntityDto, userId: string) {
    try {
      return await this.entityModel.create({
        ...dto,
        createdBy: userId,
        updatedBy: userId,
      });
    } catch (e: any) {
      if (e.code === 11000)
        throw new ConflictException(
          'You already have an entity with this name',
        );
      throw e;
    }
  }

  findAll(user: AuthUser) {
    const filter = user.role === Role.ADMIN ? {} : { createdBy: user.sub };
    return this.entityModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  // SubEntitiesService idhaiyum use pannum (owner check)
  async findOne(id: string, user: AuthUser) {
    const entity = await this.entityModel.findById(id).exec();
    if (!entity) throw new NotFoundException('Entity not found');

    const isOwner = entity.createdBy.toString() === user.sub;
    if (!isOwner && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Not your entity');
    }
    return entity;
  }

  async update(id: string, dto: UpdateEntityDto, user: AuthUser) {
    const entity = await this.findOne(id, user);
    Object.assign(entity, dto, { updatedBy: user.sub });
    try {
      return await entity.save();
    } catch (e: any) {
      if (e.code === 11000)
        throw new ConflictException(
          'You already have an entity with this name',
        );
      throw e;
    }
  }

  // entity delete pannina adhoda sub entities-um delete aagum
  async remove(id: string, user: AuthUser) {
  const entity = await this.findOne(id, user);
  await this.subEntityModel.deleteMany({ entity: entity._id }).exec();
  await this.apiKeyModel
    .updateMany({ entityId: entity._id }, { isActive: false })
    .exec();
  await entity.deleteOne();
  return { deleted: true };
}
}
