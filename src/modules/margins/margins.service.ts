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
import { ProductsService } from '../products/products.service.js';

interface MarginInput {
  wholesalePrice: number;
  markupType: MarkupType;
  markupValue: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class MarginsService {
  constructor(
    @InjectModel(Margin.name) private marginModel: Model<MarginDocument>,
    private readonly products: ProductsService,
  ) {}

  private calc(i: MarginInput) {
    const markupAmount =
      i.markupType === MarkupType.Flat
        ? i.markupValue
        : (i.wholesalePrice * i.markupValue) / 100;

    return {
      markupAmount: round(markupAmount),
      markupPercent: round((markupAmount / i.wholesalePrice) * 100),
      buyRate: round(i.wholesalePrice + markupAmount),
    };
  }

  // marginVsRetail: product retail price la irundhu ippo calculate aagum
  private view(margin: MarginDocument, retailPrice?: number) {
    const obj = margin.toObject();
    return {
      ...obj,
      marginVsRetail:
        retailPrice == null ? null : round(retailPrice - obj.buyRate),
    };
  }

  async create(dto: CreateMarginDto, userId: string) {
    const product = await this.products.findOne(dto.product); // 404 if illa

    try {
      const margin = await this.marginModel.create({
        ...dto,
        ...this.calc(dto),
        createdBy: userId,
        updatedBy: userId,
      });
      return this.view(margin, product.retailPrice);
    } catch (e: any) {
      if (e.code === 11000) {
        throw new ConflictException('Margin already exists for this product');
      }
      throw e;
    }
  }

  async findAll() {
    const margins = await this.marginModel
      .find()
      .populate(
        'product',
        'name retailPrice discountType discountValue category',
      )
      .sort({ createdAt: -1 })
      .exec();

    return margins.map((m) => this.view(m, (m.product as any)?.retailPrice));
  }

  async findOne(id: string) {
    const margin = await this.marginModel
      .findById(id)
      .populate(
        'product',
        'name retailPrice discountType discountValue category',
      )
      .exec();
    if (!margin) throw new NotFoundException('Margin not found');
    return this.view(margin, (margin.product as any)?.retailPrice);
  }

  async findByProduct(productId: string) {
    const margin = await this.marginModel
      .findOne({ product: productId })
      .exec();
    if (!margin)
      throw new NotFoundException('Margin not found for this product');
    const product = await this.products.findOne(productId);
    return this.view(margin, product.retailPrice);
  }

  async update(id: string, dto: UpdateMarginDto, userId: string) {
    const current = await this.marginModel.findById(id).exec();
    if (!current) throw new NotFoundException('Margin not found');

    const merged: MarginInput = {
      wholesalePrice: dto.wholesalePrice ?? current.wholesalePrice,
      markupType: dto.markupType ?? current.markupType,
      markupValue: dto.markupValue ?? current.markupValue,
    };

    Object.assign(current, merged, this.calc(merged), { updatedBy: userId });
    await current.save();

    const product = await this.products.findOne(current.product.toString());
    return this.view(current, product.retailPrice);
  }

  async remove(id: string) {
    const margin = await this.marginModel.findByIdAndDelete(id).exec();
    if (!margin) throw new NotFoundException('Margin not found');
    return { deleted: true };
  }
}
