import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import sanitizeHtml from 'sanitize-html';
import { Bundle, BundleDocument } from './schemas/bundle.schema.js';
import { CreateBundleDto } from './dto/create-bundle.dto.js';
import { UpdateBundleDto } from './dto/update-bundle.dto.js';
import { Status } from '../../common/enums/status.enum.js';

@Injectable()
export class BundlesService {
  constructor(
    @InjectModel(Bundle.name) private bundleModel: Model<BundleDocument>,
  ) {}

  private clean(html: string) {
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
      return await this.bundleModel.create({
        ...dto,
        longDescription: this.clean(dto.longDescription),
        createdBy: userId,
        updatedBy: userId,
      });
    } catch (e: any) {
      if (e.code === 11000)
        throw new ConflictException('Short code already exists');
      throw e;
    }
  }

  findAll(onlyActive = false) {
    return this.bundleModel
      .find(onlyActive ? { status: Status.Active } : {})
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    const bundle = await this.bundleModel.findById(id).exec();
    if (!bundle) throw new NotFoundException('Bundle not found');
    return bundle;
  }

  async update(id: string, dto: UpdateBundleDto, userId: string) {
    const data: any = { ...dto, updatedBy: userId };
    if (dto.longDescription)
      data.longDescription = this.clean(dto.longDescription);

    try {
      const bundle = await this.bundleModel
        .findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .exec();
      if (!bundle) throw new NotFoundException('Bundle not found');
      return bundle;
    } catch (e: any) {
      if (e.code === 11000)
        throw new ConflictException('Short code already exists');
      throw e;
    }
  }

  async remove(id: string) {
    const bundle = await this.bundleModel.findByIdAndDelete(id).exec();
    if (!bundle) throw new NotFoundException('Bundle not found');
    return { deleted: true };
  }
}
