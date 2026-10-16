import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Category, CategoryDocument } from './schemas/category.schema.js';

import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

// Response type for the paginated category list
export interface PaginatedCategoriesResponse {
  data: Array<{
    _id: Types.ObjectId;
    name: string;
    description?: string;
    status: boolean;
    backgroundColor?: string;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  // Create a new category
  async create(
    dto: CreateCategoryDto,
    userId: string,
  ): Promise<CategoryDocument> {
    try {
      // Validate the logged-in user's MongoDB ID
      if (!Types.ObjectId.isValid(userId)) {
        throw new NotFoundException('Invalid user ID');
      }

      // Create the category and record the creator and updater
      const category = new this.categoryModel({
        ...dto,
        createdBy: new Types.ObjectId(userId),
        updatedBy: new Types.ObjectId(userId),
      });

      // Save the category to MongoDB
      await category.save();

      // Retrieve the saved category with user names populated
      const savedCategory = await this.categoryModel
        .findById(category._id)
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .exec();

      if (!savedCategory) {
        throw new NotFoundException('Category not found after creation');
      }

      return savedCategory;
    } catch (error: unknown) {
      // Convert duplicate-key errors into HTTP 409 Conflict
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new ConflictException('Category name or slug already exists');
      }

      throw error;
    }
  }

  // Get active categories with pagination
  async findAllCategories(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedCategoriesResponse> {
    // Apply safe defaults to invalid pagination values
    page = Number.isInteger(page) && page > 0 ? page : 1;

    limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 10;

    // Calculate how many records to skip
    const skip = (page - 1) * limit;

    // Fetch the current page and total count concurrently
    const [data, total] = await Promise.all([
      this.categoryModel
        .find({ status: true })
        // Return only the required category fields
        .select('name description status backgroundColor')
        // Sort consistently between pages
        .sort({ _id: 1 })
        // Skip records from previous pages
        .skip(skip)
        // Limit the number of records
        .limit(limit)
        // Return plain objects because this is a read-only list
        .lean()
        .exec(),

      // Count only active categories
      this.categoryModel.countDocuments({ status: true }).exec(),
    ]);

    // Return the records and pagination metadata
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get one active category by ID
  async findOneCategories(id: string): Promise<CategoryDocument> {
    // Validate the category ID
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Category not found');
    }

    // Find only active categories and populate user names
    const category = await this.categoryModel
      .findOne({ _id: id, status: true })
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  // Update an existing active category
  async updateCategories(
    id: string,
    dto: UpdateCategoryDto,
    userId: string,
  ): Promise<CategoryDocument> {
    try {
      // Validate the category ID
      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundException('Category not found');
      }

      // Validate the user performing the update
      if (!Types.ObjectId.isValid(userId)) {
        throw new NotFoundException('Invalid user ID');
      }

      // Update only an active category
      const category = await this.categoryModel
        .findOneAndUpdate(
          { _id: id, status: true },
          {
            ...dto,
            updatedBy: new Types.ObjectId(userId),
          },
          {
            returnDocument: 'after',
            runValidators: true,
          },
        )
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .exec();

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      return category;
    } catch (error: unknown) {
      // Handle duplicate names and slugs
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new ConflictException('Category name or slug already exists');
      }

      throw error;
    }
  }

  // Soft-delete an active category
  async removeCategories(id: string): Promise<{ deleted: boolean }> {
    // Validate the MongoDB ID
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Category not found');
    }

    // Set status to false; do not remove the database record
    const category = await this.categoryModel
      .findOneAndUpdate(
        { _id: id, status: true },
        { status: false },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .exec();

    // Return 404 if the category is missing or already inactive
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return { deleted: true };
  }
}
