import {
  ConflictException,
  Injectable,
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

// Response type for the paginated bundle list.
export interface PaginatedBundlesResponse {
  data: BundleDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class BundlesService {
  constructor(
    @InjectModel(Bundle.name)
    private readonly bundleModel: Model<BundleDocument>,
  ) {}

  // ---------- Helpers ----------

  // Validate an ObjectId before using it in database operations.
  private validateObjectId(id: string, message = 'Bundle not found'): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(message);
    }
  }

  // Convert duplicate-key errors into a clear API response.
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

  // ---------- Create ----------

  // Create a bundle and store the creator/updater IDs.
  // Sanitize rich-text content before saving it.
  async create(dto: CreateBundleDto, userId: string): Promise<BundleDocument> {
    this.validateObjectId(userId, 'Invalid user ID');

    try {
      const bundle = new this.bundleModel({
        ...dto,
        longDescription: sanitizeRichText(dto.longDescription),
        createdBy: new Types.ObjectId(userId),
        updatedBy: new Types.ObjectId(userId),
      });

      return await bundle.save();
    } catch (error: unknown) {
      return this.handleDuplicateError(error);
    }
  }

  // ---------- DashBoard -----------
  
  async dashBoardData(): Promise<any> {
    try {
      const [totalData, pricingTypeCounts] = await Promise.all([
        // Get the total number of records
        this.bundleModel.countDocuments().exec(),

        // Count records grouped by PricingType
        this.bundleModel
          .aggregate([
            {
              $group: {
                _id: '$pricingType',
                count: { $sum: 1 },
              },
            },
          ])
          .exec(),
      ]);

      // Return counts for both types, including zero counts
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
    } catch (error) {
      throw error;
    }
  }

  // ---------- Find All: Pagination + Search ----------

  // Return active bundles with pagination and optional text search.
  // Search checks name, shortCode, and longDescription.
  // Creator and updater details are populated for each result.
  async findAll(
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<PaginatedBundlesResponse> {
    // Apply safe pagination defaults and a maximum page size.
    page = Number.isInteger(page) && page > 0 ? page : 1;

    limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 10;

    // Only include active bundles.
    const filter: Record<string, any> = {
      status: true,
    };

    // Escape regex characters so search input is treated literally.
    const searchTerm = search?.trim();

    if (searchTerm) {
      const safeSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { shortCode: { $regex: safeSearch, $options: 'i' } },
        {
          longDescription: {
            $regex: safeSearch,
            $options: 'i',
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    // Fetch the requested page and total matching count concurrently.
    const [data, total] = await Promise.all([
      this.bundleModel
        .find(filter)
        // .populate({
        //   path: 'createdBy',
        //   select: 'name',
        //   model: 'User',
        // })
        // .populate({
        //   path: 'updatedBy',
        //   select: 'name',
        //   model: 'User',
        // })
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

  // ---------- Find One ----------

  // Return a single active bundle by ID.
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

    return bundle;
  }

  // ---------- Update ----------

  // Update an active bundle and record the user who changed it.
  // Sanitize longDescription when it is included in the request.
  async update(
    id: string,
    dto: UpdateBundleDto,
    userId: string,
  ): Promise<BundleDocument> {
    this.validateObjectId(id);
    this.validateObjectId(userId, 'Invalid user ID');

    const data: Record<string, any> = {
      ...dto,
      updatedBy: new Types.ObjectId(userId),
    };

    if (dto.longDescription !== undefined) {
      data.longDescription = sanitizeRichText(dto.longDescription);
    }

    try {
      const bundle = await this.bundleModel
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

      if (!bundle) {
        throw new NotFoundException('Bundle not found');
      }

      return bundle;
    } catch (error: unknown) {
      return this.handleDuplicateError(error);
    }
  }

  // ---------- Soft Delete ----------

  // Mark the bundle inactive instead of permanently deleting it.
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
