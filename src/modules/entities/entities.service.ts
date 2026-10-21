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
    return this.entityModel.findOne({ _id: id, isActive: true }).exec();
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

  async findAll(user: AuthUser) {
    const filter = user.role === Role.ADMIN ? {} : { createdBy: user.sub };

    const entities = await this.entityModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (entities.length === 0) {
      return [];
    }

    const entityIds = entities.map((entity) => entity._id.toString());

    // Fetch sub-entities and support existing string/ObjectId data.
    const subEntities = await this.subEntityModel
      .find({
        $expr: {
          $in: [{ $toString: '$entity' }, entityIds],
        },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const subEntitiesByEntity = new Map<string, typeof subEntities>();

    for (const subEntity of subEntities) {
      const entityId = String(subEntity.entity);

      const existing = subEntitiesByEntity.get(entityId) ?? [];

      existing.push(subEntity);
      subEntitiesByEntity.set(entityId, existing);
    }

    return entities.map((entity) => ({
      ...entity,
      subEntities: (subEntitiesByEntity.get(entity._id.toString()) ?? []).map(
        (subEntity) => ({
          id: subEntity._id,
          name: subEntity.name,
        }),
      ),
    }));
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
