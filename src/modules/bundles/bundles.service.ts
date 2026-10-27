import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Bundle,
  BundleDocument,
  PricingType,
} from './schemas/bundle.schema.js';

import { CreateBundleDto } from './dto/create-bundle.dto.js';
import { UpdateBundleDto } from './dto/update-bundle.dto.js';
import { sanitizeRichText } from '../../common/utils/sanitize.util.js';
import { S3Service } from '../uploads/s3.service.js';

import type { Express } from 'express';

export interface PaginatedBundlesResponse {
  data: BundleDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class BundlesService {
  private readonly logger = new Logger(BundlesService.name);

  constructor(
    @InjectModel(Bundle.name)
    private readonly bundleModel: Model<BundleDocument>,
    private readonly s3Service: S3Service,
  ) {}

  // Validate MongoDB ObjectId.
  private validateObjectId(id: string, message = 'Bundle not found'): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(message);
    }
  }

  // Handle duplicate shortCode errors.
  private handleDuplicateError(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    ) {
      throw new ConflictException('Short code already exists');
    }

    throw error;
  }

  // Delete an image from S3 without exposing sensitive details.
  private async deleteS3Image(key?: string): Promise<void> {
    if (!key) return;

    try {
      await this.s3Service.delete(key);
    } catch {
      this.logger.warn('Unable to delete bundle image from S3');
    }
  }

  // Return the S3 URL in API responses without saving the URL to MongoDB.
  private toResponse(bundle: BundleDocument): BundleDocument {
    const key = bundle.template?.backgroundImage;

    if (key) {
      bundle.template.backgroundImage = this.s3Service.urlFor(key) ?? '';
    }

    return bundle;
  }

  // Create bundle.
  async create(
    dto: CreateBundleDto,
    userId: string,
    backgroundImage?: Express.Multer.File,
  ): Promise<BundleDocument> {
    this.validateObjectId(userId, 'Invalid user ID');

    let uploadedKey: string | undefined;

    try {
      const templateData = { ...dto.template };

      if (backgroundImage) {
        const uploaded = await this.s3Service.upload(
          'bundles',
          backgroundImage,
        );

        uploadedKey = uploaded.key;
        templateData.backgroundImage = uploaded.key;
      }

      const bundle = new this.bundleModel({
        ...dto,
        template: templateData,
        longDescription: sanitizeRichText(dto.longDescription),
        createdBy: new Types.ObjectId(userId),
        updatedBy: new Types.ObjectId(userId),
      });

      const savedBundle = await bundle.save();

      return this.toResponse(savedBundle);
    } catch (error: unknown) {
      if (uploadedKey) {
        await this.deleteS3Image(uploadedKey);
      }

      return this.handleDuplicateError(error);
    }
  }

  // Dashboard data.
  async dashBoardData(): Promise<{
    totalData: number;
    pricingTypeCounts: {
      addOn: number;
      bundle: number;
    };
  }> {
    const [totalData, pricingTypeCounts] = await Promise.all([
      this.bundleModel.countDocuments().exec(),
      this.bundleModel
        .aggregate<{ _id: PricingType; count: number }>([
          {
            $group: {
              _id: '$pricingType',
              count: { $sum: 1 },
            },
          },
        ])
        .exec(),
    ]);

    const counts = {
      addOn: 0,
      bundle: 0,
    };

    for (const item of pricingTypeCounts) {
      if (item._id === PricingType.AddOn) {
        counts.addOn = item.count;
      } else if (item._id === PricingType.Bundle) {
        counts.bundle = item.count;
      }
    }

    return {
      totalData,
      pricingTypeCounts: counts,
    };
  }

  // Get active bundles with pagination and search.
  async findAll(
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<PaginatedBundlesResponse> {
    page = Number.isInteger(page) && page > 0 ? page : 1;
    limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 10;

    const filter: Record<string, any> = {
      status: true,
    };

    const searchTerm = search?.trim();

    if (searchTerm) {
      const safeSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { shortCode: { $regex: safeSearch, $options: 'i' } },
        { longDescription: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.bundleModel
        .find(filter)
        .select(
          '_id name pricingType price discountValue sellingPrice status createdAt',
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),

      this.bundleModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get one active bundle.
  async findOne(id: string): Promise<BundleDocument> {
    this.validateObjectId(id);

    const bundle = await this.bundleModel
      .findOne({
        _id: id,
        status: true,
      })
      .populate({
        path: 'createdBy',
        select: 'name',
        model: 'User',
      })
      .populate({
        path: 'updatedBy',
        select: 'name',
        model: 'User',
      })
      .exec();

    if (!bundle) {
      throw new NotFoundException('Bundle not found');
    }

    return this.toResponse(bundle);
  }

  // Update bundle and optionally replace its S3 background image.
  async update(
    id: string,
    dto: UpdateBundleDto,
    userId: string,
    backgroundImage?: Express.Multer.File,
  ): Promise<BundleDocument> {
    this.validateObjectId(id);
    this.validateObjectId(userId, 'Invalid user ID');

    const existing = await this.bundleModel.findOne({
      _id: id,
      status: true,
    });

    if (!existing) {
      throw new NotFoundException('Bundle not found');
    }

    const oldImageKey = existing.template?.backgroundImage;
    let uploadedKey: string | undefined;
    let savedSuccessfully = false;

    try {
      const data: Record<string, any> = {
        ...dto,
        updatedBy: new Types.ObjectId(userId),
      };

      if (dto.longDescription !== undefined) {
        data.longDescription = sanitizeRichText(dto.longDescription);
      }

      // Preserve existing template properties when updating only some fields.
      if (dto.template || backgroundImage) {
        data.template = {
          ...existing.template,
          ...(dto.template ?? {}),
        };
      }

      // Upload replacement image to S3.
      if (backgroundImage) {
        const uploaded = await this.s3Service.upload(
          'bundles',
          backgroundImage,
        );

        uploadedKey = uploaded.key;

        data.template = {
          ...(data.template ?? existing.template),
          backgroundImage: uploaded.key,
        };
      }

      const updatedBundle = await this.bundleModel
        .findOneAndUpdate(
          {
            _id: id,
            status: true,
          },
          data,
          {
            new: true,
            runValidators: true,
          },
        )
        .populate({
          path: 'createdBy',
          select: 'name',
          model: 'User',
        })
        .populate({
          path: 'updatedBy',
          select: 'name',
          model: 'User',
        })
        .exec();

      if (!updatedBundle) {
        throw new NotFoundException('Bundle not found');
      }

      savedSuccessfully = true;

      // Delete the previous image only after the database update succeeds.
      if (uploadedKey && oldImageKey && oldImageKey !== uploadedKey) {
        await this.deleteS3Image(oldImageKey);
      }

      return this.toResponse(updatedBundle);
    } catch (error: unknown) {
      // Do not delete the new image if MongoDB already references it.
      if (uploadedKey && !savedSuccessfully) {
        await this.deleteS3Image(uploadedKey);
      }

      return this.handleDuplicateError(error);
    }
  }

  // Soft-delete bundle.
  async remove(id: string): Promise<{ deleted: boolean }> {
    this.validateObjectId(id);

    const bundle = await this.bundleModel
      .findOneAndUpdate(
        {
          _id: id,
          status: true,
        },
        {
          status: false,
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!bundle) {
      throw new NotFoundException('Bundle not found or already deleted');
    }

    return { deleted: true };
  }
}
