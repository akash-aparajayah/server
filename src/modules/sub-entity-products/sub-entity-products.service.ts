import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SubEntityProduct,
  SubEntityProductDocument,
} from './schemas/sub-entity-product.schema.js';
import { SyncProductsDto } from './dto/sync-products.dto.js';
import { UpdateMarginsDto } from './dto/update-margins.dto.js';
import { SubEntitiesService } from '../sub-entities/sub-entities.service.js';
import { ProductsService } from '../products/products.service.js';
import { calcMargin, round2 } from '../../common/utils/margin.util.js';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';

@Injectable()
export class SubEntityProductsService {
  constructor(
    @InjectModel(SubEntityProduct.name)
    private model: Model<SubEntityProductDocument>,
    private readonly subEntities: SubEntitiesService,
    private readonly products: ProductsService,
  ) { }

  // marginVsRetail is calculated from the product's current retail price
  private view(doc: SubEntityProductDocument) {
    const obj: any = doc.toObject();
    const retail = obj.product?.retailPrice;
    return {
      ...obj,
      margin: obj.margin
        ? {
          ...obj.margin,
          marginVsRetail:
            retail == null ? null : round2(retail - obj.margin.buyRate),
        }
        : null,
    };
  }

  // ---------- Manage Products drawer ----------

  async picker(subEntityId: string, user: AuthUser) {
    await this.subEntities.findOne(subEntityId, user);

    const [all, rows] = await Promise.all([
      this.products.findAllForPicker(),
      this.model.find({ subEntity: subEntityId }).select('product').exec(),
    ]);
    const selected = new Set(rows.map((r) => r.product.toString()));

    return all.map((p) => ({
      ...p.toObject(),
      selected: selected.has(p._id.toString()),
    }));
  }

  // selected products + margin in one call
  async sync(subEntityId: string, dto: SyncProductsDto, user: AuthUser) {
    await this.subEntities.findOne(subEntityId, user);

    const ids = dto.items.map((i) => i.product);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Same product is repeated in the request');
    }

    if (ids.length) {
      const found = await this.products.findByIds(ids);
      if (found.length !== ids.length) {
        throw new NotFoundException('One or more products not found');
      }
    }

    const existing = await this.model
      .find({ subEntity: subEntityId })
      .select('product')
      .exec();
    const existingSet = new Set(existing.map((e) => e.product.toString()));
    const requestedSet = new Set(ids);
    const toRemove = [...existingSet].filter((id) => !requestedSet.has(id));

    if (toRemove.length) {
      await this.model
        .deleteMany({ subEntity: subEntityId, product: { $in: toRemove } })
        .exec();
    }

    if (dto.items.length) {
      const userId = new Types.ObjectId(user.sub);
      const subId = new Types.ObjectId(subEntityId);

      await this.model.bulkWrite(
        dto.items.map((i) => {
          const set: Record<string, any> = { updatedBy: userId };
          if (i.margin) set.margin = { ...i.margin, ...calcMargin(i.margin) };

          return {
            updateOne: {
              filter: {
                subEntity: subId,
                product: new Types.ObjectId(i.product),
              },
              update: { $set: set, $setOnInsert: { createdBy: userId } },
              upsert: true,
            },
          };
        }),
      );
    }

    return {
      removed: toRemove.length,
      total: ids.length,
      items: await this.findSelected(subEntityId, user),
    };
  }

  // ---------- Margin Settings ----------

  async findSelected(subEntityId: string, user: AuthUser) {
    await this.subEntities.findOne(subEntityId, user);

    const docs = await this.model
      .find({ subEntity: subEntityId })
      .populate({
        path: 'product',
        select: 'name retailPrice discountType discountValue category status',
        populate: { path: 'category', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .exec();

    return docs.map((d) => this.view(d));
  }

  // API key requests have no logged-in user, so there is no owner check here.
  // The key guard has already checked: key exists, active, not expired, environment active.
  async findForApiKey(subEntityId: string) {
    const docs = await this.model
      .find({ subEntity: subEntityId })
      .populate({
        path: 'product',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'bundled', select: 'name shortCode' },
        ],
      })
      .sort({ createdAt: -1 })
      .exec();

    return docs.map((d) => this.view(d));
  }

  // update margin only (products must already be selected)
  async updateMargins(
    subEntityId: string,
    dto: UpdateMarginsDto,
    user: AuthUser,
  ) {
    await this.subEntities.findOne(subEntityId, user);

    const ids = dto.items.map((i) => i.product);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Same product is repeated in the request');
    }

    const count = await this.model.countDocuments({
      subEntity: subEntityId,
      product: { $in: ids },
    });
    if (count !== ids.length) {
      throw new BadRequestException(
        'Select these products first, then set the margin',
      );
    }

    await this.model.bulkWrite(
      dto.items.map((i) => ({
        updateOne: {
          filter: {
            subEntity: new Types.ObjectId(subEntityId),
            product: new Types.ObjectId(i.product),
          },
          update: {
            $set: {
              margin: { ...i.margin, ...calcMargin(i.margin) },
              updatedBy: new Types.ObjectId(user.sub),
            },
          },
        },
      })),
    );

    return this.findSelected(subEntityId, user);
  }

  // ---------- card counts ----------

  async summary(subEntityId: string, user: AuthUser) {
    await this.subEntities.findOne(subEntityId, user);

    const [selected, available, withMargin] = await Promise.all([
      this.model.countDocuments({ subEntity: subEntityId }),
      this.products.count(),
      this.model.countDocuments({
        subEntity: subEntityId,
        margin: { $exists: true },
      }),
    ]);

    return { selected, available, withMargin };
  }
}
