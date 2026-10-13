import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Margin, MarginDocument, MarkupType } from './schemas/margin.schema.js';
import { CreateMarginDto } from './dto/create-margin.dto.js';
import { UpdateMarginDto } from './dto/update-margin.dto.js';

interface MarginInput {
  wholesalePrice: number;
  retailPrice: number;
  markupType: MarkupType;
  markupValue: number;
}

@Injectable()
export class MarginsService {
  constructor(
    @InjectModel(Margin.name) private marginModel: Model<MarginDocument>,
  ) {}

  private calc(i: MarginInput) {
    const r = (n: number) => Math.round(n * 100) / 100;

    const markupAmount =
      i.markupType === MarkupType.Flat
        ? i.markupValue
        : (i.wholesalePrice * i.markupValue) / 100;

    const markupPercent = (markupAmount / i.wholesalePrice) * 100;
    const buyRate = i.wholesalePrice + markupAmount;
    const marginVsRetail = i.retailPrice - buyRate;

    return {
      markupAmount: r(markupAmount),
      markupPercent: r(markupPercent),
      buyRate: r(buyRate),
      marginVsRetail: r(marginVsRetail),
    };
  }

  async create(dto: CreateMarginDto, userId: string) {
    // Product module vandha aprom: await this.productsService.findOne(dto.product);
    try {
      return await this.marginModel.create({
        ...dto,
        ...this.calc(dto),
        createdBy: userId,
        updatedBy: userId,
      });
    } catch (e: any) {
      if (e.code === 11000) {
        throw new ConflictException('Margin already exists for this product');
      }
      throw e;
    }
  }

  findAll() {
    return this.marginModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const margin = await this.marginModel.findById(id).exec();
    if (!margin) throw new NotFoundException('Margin not found');
    return margin;
  }

  async findByProduct(productId: string) {
    const margin = await this.marginModel
      .findOne({ product: productId })
      .exec();
    if (!margin)
      throw new NotFoundException('Margin not found for this product');
    return margin;
  }

  async update(id: string, dto: UpdateMarginDto, userId: string) {
    const current = await this.marginModel.findById(id).exec();
    if (!current) throw new NotFoundException('Margin not found');

    // pazhaya values + puthu values merge pannitu thirumba calculate
    const merged: MarginInput = {
      wholesalePrice: dto.wholesalePrice ?? current.wholesalePrice,
      retailPrice: dto.retailPrice ?? current.retailPrice,
      markupType: dto.markupType ?? current.markupType,
      markupValue: dto.markupValue ?? current.markupValue,
    };

    Object.assign(current, merged, this.calc(merged), { updatedBy: userId });
    return current.save();
  }

  async remove(id: string) {
    const margin = await this.marginModel.findByIdAndDelete(id).exec();
    if (!margin) throw new NotFoundException('Margin not found');
    return { deleted: true };
  }
}
