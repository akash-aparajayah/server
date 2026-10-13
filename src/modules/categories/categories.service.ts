import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CategoryQueryDto } from './dto/category-query.dto.js';

const SORTABLE = ['name', 'status', 'createdAt', 'updatedAt'];

@Injectable()
export class CategoriesService {
  constructor(@InjectModel(Category.name) private model: Model<CategoryDocument>) {}

  async create(userId: string, dto: CreateCategoryDto) {
    try {
      return await this.model.create({ ...dto, createdBy: userId, updatedBy: userId });
    } catch (e: any) {
      if (e.code === 11000) throw new ConflictException('Category name already exists');
      throw e;
    }
  }

  async findAll(q: CategoryQueryDto) {
    const filter: Record<string, any> = {};
    if (q.search) filter.name = { $regex: q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (q.status) filter.status = q.status;

    const sortBy = SORTABLE.includes(q.sortBy) ? q.sortBy : 'createdAt';
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ [sortBy]: q.order === 'asc' ? 1 : -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .exec(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) };
  }

  async findOne(id: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Category not found');
    return doc;
  }

  async update(id: string, userId: string, dto: UpdateCategoryDto) {
    try {
      const doc = await this.model
        .findByIdAndUpdate(id, { ...dto, updatedBy: userId }, { new: true })
        .exec();
      if (!doc) throw new NotFoundException('Category not found');
      return doc;
    } catch (e: any) {
      if (e.code === 11000) throw new ConflictException('Category name already exists');
      throw e;
    }
  }
}