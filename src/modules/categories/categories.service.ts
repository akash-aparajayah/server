import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { Status } from '../../common/enums/status.enum.js';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  async create(dto: CreateCategoryDto, userId: string) {
    try {
      return await this.categoryModel.create({
        ...dto,
        createdBy: userId,
        updatedBy: userId,
      });
    } catch (e: any) {
      if (e.code === 11000)
        throw new ConflictException('Name or slug already exists');
      throw e;
    }
  }

  async findAll(onlyActive = false) {
    return this.categoryModel
      .find(onlyActive ? { status: Status.Active } : {})
      .sort({ name: 1 })
      .exec();
  }

  async findOne(id: string) {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, userId: string) {
    try {
      const category = await this.categoryModel
        .findByIdAndUpdate(id, { ...dto, updatedBy: userId }, { new: true })
        .exec();
      if (!category) throw new NotFoundException('Category not found');
      return category;
    } catch (e: any) {
      if (e.code === 11000)
        throw new ConflictException('Name or slug already exists');
      throw e;
    }
  }

  async remove(id: string) {
    const category = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!category) throw new NotFoundException('Category not found');
    return { deleted: true };
  }
}
