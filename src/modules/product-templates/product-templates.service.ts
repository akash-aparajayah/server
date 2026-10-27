// src/modules/product-templates/product-templates.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ProductTemplate,
  ProductTemplateDocument,
  TemplateStatus,
} from './schemas/product-template.schema.js';
import { CreateProductTemplateDto } from './dto/create-product-template.dto.js';
import { UpdateProductTemplateDto } from './dto/update-product-template.dto.js';
import type {
  AuditUserView,
  ProductTemplatePage,
  ProductTemplateView,
} from './interfaces/product-template.interface.js';
import { S3Service } from '../uploads/s3.service.js';

export type TemplateFiles = {
  bgImage?: Express.Multer.File[];
  frontImage?: Express.Multer.File[];
};

const COLORS = [
  'cardBg',
  'buttonBg',
  'buttonText',
  'textPrimary',
  'textSecondary',
] as const;

const AUDIT_POPULATE = [
  { path: 'createdBy', select: 'name' },
  { path: 'updatedBy', select: 'name' },
];

@Injectable()
export class ProductTemplatesService {
  private readonly logger = new Logger(ProductTemplatesService.name);

  constructor(
    @InjectModel(ProductTemplate.name)
    private readonly model: Model<ProductTemplateDocument>,
    private readonly s3Service: S3Service,
  ) {}

  private userId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    return new Types.ObjectId(id);
  }

  private toAudit(user: unknown): AuditUserView | undefined {
    if (!user) return undefined;

    if (typeof user === 'object' && user !== null && '_id' in user) {
      const u = user as { _id: Types.ObjectId; name?: string };

      return {
        id: u._id.toString(),
        name: u.name,
      };
    }

    return { id: String(user) };
  }

  private toView(d: ProductTemplateDocument): ProductTemplateView {
    return {
      id: d._id.toString(),
      name: d.name,
      status: d.status,
      bgImage: d.bgImage ? (this.s3Service.urlFor(d.bgImage) ?? '') : '',
      frontImage: d.frontImage
        ? (this.s3Service.urlFor(d.frontImage) ?? '')
        : '',
      cardBg: d.cardBg,
      buttonBg: d.buttonBg,
      buttonText: d.buttonText,
      textPrimary: d.textPrimary,
      textSecondary: d.textSecondary,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      createdBy: this.toAudit(d.createdBy),
      updatedBy: this.toAudit(d.updatedBy),
    };
  }

  private isDuplicate(e: unknown): boolean {
    return (
      typeof e === 'object' &&
      e !== null &&
      (e as { code?: number }).code === 11000
    );
  }

  private async removeFile(key?: string): Promise<void> {
    if (!key) return;

    try {
      await this.s3Service.delete(key);
    } catch {
      this.logger.warn('Unable to remove product template image from S3');
    }
  }

  private async cleanup(keys: string[] = []): Promise<void> {
    await Promise.all(keys.map((key) => this.removeFile(key)));
  }

  async create(
    dto: CreateProductTemplateDto,
    files: TemplateFiles | undefined,
    userId: string,
  ): Promise<ProductTemplateView> {
    const uploadedKeys: string[] = [];

    try {
      const uid = this.userId(userId);
      const bg = files?.bgImage?.[0];
      const front = files?.frontImage?.[0];

      let bgKey = '';
      let frontKey = '';

      if (bg) {
        const uploaded = await this.s3Service.upload('product-templates', bg);

        bgKey = uploaded.key;
        uploadedKeys.push(bgKey);
      }

      if (front) {
        const uploaded = await this.s3Service.upload(
          'product-templates',
          front,
        );

        frontKey = uploaded.key;
        uploadedKeys.push(frontKey);
      }

      const doc = await this.model.create({
        name: dto.name,
        status: dto.status as TemplateStatus,
        bgImage: bgKey,
        frontImage: frontKey,
        ...Object.fromEntries(
          COLORS.map((color) => [color, (dto[color] ?? '').trim()]),
        ),
        createdBy: uid,
        updatedBy: uid,
      });

      await doc.populate(AUDIT_POPULATE);

      return this.toView(doc);
    } catch (e) {
      await this.cleanup(uploadedKeys);

      if (this.isDuplicate(e)) {
        throw new ConflictException('Template name already exists');
      }

      throw e;
    }
  }

  async findAll(
    page: number,
    limit: number,
    search: string,
  ): Promise<ProductTemplatePage> {
    const filter: Record<string, unknown> = {};
    const q = search.trim();

    if (q) {
      filter['name'] = {
        $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
    }

    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .populate(AUDIT_POPULATE)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),

      this.model.countDocuments(filter).exec(),
    ]);

    return {
      data: docs.map((doc) => this.toView(doc)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findById(id: string): Promise<ProductTemplateView> {
    const doc = await this.model.findById(id).populate(AUDIT_POPULATE).exec();

    if (!doc) {
      throw new NotFoundException('Product template not found');
    }

    return this.toView(doc);
  }

  async update(
    id: string,
    dto: UpdateProductTemplateDto,
    files: TemplateFiles | undefined,
    userId: string,
  ): Promise<ProductTemplateView> {
    const uploadedKeys: string[] = [];

    try {
      const uid = this.userId(userId);

      const doc = await this.model.findById(id).exec();

      if (!doc) {
        throw new NotFoundException('Product template not found');
      }

      const oldBg = doc.bgImage;
      const oldFront = doc.frontImage;

      const bg = files?.bgImage?.[0];
      const front = files?.frontImage?.[0];

      let newBgKey: string | undefined;
      let newFrontKey: string | undefined;

      if (bg) {
        const uploaded = await this.s3Service.upload('product-templates', bg);

        newBgKey = uploaded.key;
        uploadedKeys.push(newBgKey);
      }

      if (front) {
        const uploaded = await this.s3Service.upload(
          'product-templates',
          front,
        );

        newFrontKey = uploaded.key;
        uploadedKeys.push(newFrontKey);
      }

      if (dto.name !== undefined) {
        doc.name = dto.name;
      }

      if (dto.status !== undefined) {
        doc.status = dto.status as TemplateStatus;
      }

      for (const color of COLORS) {
        if (dto[color] !== undefined) {
          doc[color] = dto[color]!.trim();
        }
      }

      if (newBgKey) {
        doc.bgImage = newBgKey;
      }

      if (newFrontKey) {
        doc.frontImage = newFrontKey;
      }

      doc.updatedBy = uid;

      await doc.save();

      if (newBgKey && oldBg) {
        await this.removeFile(oldBg);
      }

      if (newFrontKey && oldFront) {
        await this.removeFile(oldFront);
      }

      await doc.populate(AUDIT_POPULATE);

      return this.toView(doc);
    } catch (e) {
      await this.cleanup(uploadedKeys);

      if (this.isDuplicate(e)) {
        throw new ConflictException('Template name already exists');
      }

      throw e;
    }
  }
}
