import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SubEntity, SubEntityDocument } from './schemas/sub-entity.schema.js';
import { CreateSubEntityDto } from './dto/create-sub-entity.dto.js';
import { UpdateSubEntityDto } from './dto/update-sub-entity.dto.js';
import { EntitiesService } from '../entities/entities.service.js';
import { AuthUser } from '../../common/interfaces/auth-user.interface.js';
import { Product, ProductDocument } from '../products/schemas/product.schema.js';
import { Margin, MarginDocument } from '../margins/schemas/margin.schema.js';

@Injectable()
export class SubEntitiesService {
  constructor(
    @InjectModel(SubEntity.name)
    private subEntityModel: Model<SubEntityDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(Margin.name)
    private marginModel: Model<MarginDocument>,
    private readonly entities: EntitiesService,
  ) { }

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
      if (e.code === 11000)
        throw new ConflictException(
          'This entity already has a sub entity with this name',
        );
      throw e;
    }
  }

  async findAllByEntity(entityId: string, user: AuthUser) {
    await this.entities.findOne(entityId, user); // owner check
    return this.subEntityModel
      .find({ entity: entityId })
      .sort({ createdAt: -1 })
      .exec();
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
      if (e.code === 11000)
        throw new ConflictException(
          'This entity already has a sub entity with this name',
        );
      throw e;
    }
  }

  // replaces the environment's product list (empty array clears it)
  async saveProducts(id: string, productIds: string[], user: AuthUser) {
    const sub = await this.findOne(id, user); // owner check
    const unique = [...new Set(productIds)];

    // older environments (no providers yet) skip this check
    if (sub.providerIds?.length && unique.length) {
      const found = await this.productModel
        .find({ _id: { $in: unique } })
        .select('providerId')
        .lean()
        .exec();
      const allowed = new Set(sub.providerIds);
      const bad = found.some(
        (p) => !p.providerId || !allowed.has(p.providerId.toString()),
      );
      if (bad || found.length !== unique.length) {
        throw new BadRequestException(
          'Some products do not belong to the providers selected for this environment',
        );
      }
    }

    Object.assign(sub, {
      products: unique.map((p) => new Types.ObjectId(p)),
      updatedBy: user.sub,
    });
    return sub.save();
  }

  // For API key requests (no logged-in user): picked products + the margin saved in Margin Settings
  async findProductsForApiKey(subEntityId: string) {
    const sub = await this.subEntityModel
      .findById(subEntityId)
      .select('products')
      .lean()
      .exec();
    if (!sub?.products?.length) return [];

    const [docs, margins] = await Promise.all([
      this.productModel
        .find({ _id: { $in: sub.products } })
        .populate('category', 'name')
        .populate('bundled', 'name shortCode')
        .exec(),
      this.marginModel.find({ product: { $in: sub.products } }).lean().exec(),
    ]);
    const marginOf = new Map(margins.map((m) => [m.product.toString(), m]));
    const round = (n: number) => Math.round(n * 100) / 100;

    return docs.map((d) => {
      const p: any = d.toJSON(); // includes the sellingPrice virtual
      const m = marginOf.get(d._id.toString());
      return {
        id: p._id,
        name: p.name,
        status: p.status,
        category: p.category ? { id: p.category._id, name: p.category.name } : null,
        marketplace: p.marketplace,
        dashboard: p.dashboard,
        bundles: (p.bundled ?? []).map((b: any) => ({
          id: b._id,
          name: b.name,
          shortCode: b.shortCode,
        })),
        pricing: {
          retailPrice: p.retailPrice,
          discountType: p.discountType,
          discountValue: p.discountValue,
          sellingPrice: p.sellingPrice,
        },
        // null when no margin was set for this product
        margin: m
          ? {
            wholesalePrice: m.wholesalePrice,
            markupType: m.markupType,
            markupValue: m.markupValue,
            markupAmount: m.markupAmount,
            markupPercent: m.markupPercent,
            buyRate: m.buyRate,
            marginVsRetail:
              p.retailPrice == null ? null : round(p.retailPrice - m.buyRate),
          }
          : null,
      };
    });
  }

  async remove(id: string, user: AuthUser) {
    const sub = await this.findOne(id, user);
    await sub.deleteOne();
    return { deleted: true };
  }

  // no user / owner check: used only by ApiKeyGuard (API key requests have no logged-in user)
  async findActiveById(id: string) {
    return this.subEntityModel
      .findOne({ _id: id, isActive: true })
      .select('_id')
      .lean()
      .exec();
  }
}
