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

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(dto: CreateCategoryDto, userId: string) {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new NotFoundException('Invalid user ID');
      }

      const category = new this.categoryModel({
        ...dto,
        createdBy: new Types.ObjectId(userId),
        updatedBy: new Types.ObjectId(userId),
      });

      await category.save();

      return this.categoryModel
        .findById(category._id)
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .exec();
    } catch (e: any) {
      if (e.code === 11000) {
        throw new ConflictException('Name or slug already exists');
      }
      throw e;
    }
  }

  async findAll(onlyActive = false) {
    return this.categoryModel
      .find(onlyActive ? { status: true } : {})
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ name: 1 })
      .exec();
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Category not found');
    }

    const category = await this.categoryModel
      .findById(id)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, userId: string) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundException('Category not found');
      }

      if (!Types.ObjectId.isValid(userId)) {
        throw new NotFoundException('Invalid user ID');
      }

      const category = await this.categoryModel
        .findByIdAndUpdate(
          id,
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
    } catch (e: any) {
      if (e.code === 11000) {
        throw new ConflictException('Name or slug already exists');
      }
      throw e;
    }
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Category not found');
    }

    const category = await this.categoryModel.findByIdAndDelete(id).exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return { deleted: true };
  }
}
