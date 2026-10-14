import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import sanitizeHtml from 'sanitize-html';

import { Bundle, BundleDocument } from './schemas/bundle.schema.js';
import { CreateBundleDto } from './dto/create-bundle.dto.js';
import { UpdateBundleDto } from './dto/update-bundle.dto.js';

@Injectable()
export class BundlesService {
  constructor(
    @InjectModel(Bundle.name)
    private readonly bundleModel: Model<BundleDocument>,
  ) {}

  private clean(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'h1',
        'h2',
        'img',
        'u',
      ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*': ['style'],
      },
    });
  }

  async create(dto: CreateBundleDto, userId: string) {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new NotFoundException('Invalid user ID');
      }

      const bundle = new this.bundleModel({
        ...dto,
        longDescription: this.clean(dto.longDescription),
        createdBy: new Types.ObjectId(userId),
        updatedBy: new Types.ObjectId(userId),
      });

      return await bundle.save();
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('Short code already exists');
      }
      throw error;
    }
  }

  async findAll(onlyActive = false) {
    return this.bundleModel
      .find(onlyActive ? { status: true } : {})
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Bundle not found');
    }

    const bundle = await this.bundleModel.findById(id).exec();

    if (!bundle) {
      throw new NotFoundException('Bundle not found');
    }

    return bundle;
  }

  async update(id: string, dto: UpdateBundleDto, userId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Bundle not found');
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    const data: Record<string, any> = {
      ...dto,
      updatedBy: new Types.ObjectId(userId),
    };

    if (dto.longDescription !== undefined) {
      data.longDescription = this.clean(dto.longDescription);
    }

    try {
      const bundle = await this.bundleModel
        .findByIdAndUpdate(id, data, {
          new: true,
          runValidators: true,
        })
        .exec();

      if (!bundle) {
        throw new NotFoundException('Bundle not found');
      }

      return bundle;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('Short code already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Bundle not found');
    }

    const bundle = await this.bundleModel.findByIdAndDelete(id).exec();

    if (!bundle) {
      throw new NotFoundException('Bundle not found');
    }

    return { deleted: true };
  }
}
