import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { unlink } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

import {
    ProductTemplate,
    ProductTemplateDocument,
    TemplateStatus,
} from './schemas/product-template.schema.js';
import { CreateProductTemplateDto } from './dto/create-product-template.dto.js';
import { UpdateProductTemplateDto } from './dto/update-product-template.dto.js';
import type {
    AuditUserView,
    ProductTemplatePage,
    ProductTemplateView,
} from './interfaces/product-template.interface.js';
import { TEMPLATE_URL_PREFIX } from '../../common/utils/template-upload.js';

export type TemplateFiles = {
    bgImage?: Express.Multer.File[];
    frontImage?: Express.Multer.File[];
};

const COLORS = [
    'cardBg',
    'buttonBg',
    'buttonText',
    'textPrimary',
    'textSecondary',
] as const;

const AUDIT_POPULATE = [
    { path: 'createdBy', select: 'name' },
    { path: 'updatedBy', select: 'name' },
];

@Injectable()
export class ProductTemplatesService {
    private readonly logger = new Logger(ProductTemplatesService.name);

    constructor(
        @InjectModel(ProductTemplate.name)
        private readonly model: Model<ProductTemplateDocument>,
    ) { }

    // ---------- helpers ----------

    private userId(id: string): Types.ObjectId {
        if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid user ID');
        return new Types.ObjectId(id);
    }

    private toAudit(user: unknown): AuditUserView | undefined {
        if (!user) return undefined;
        if (typeof user === 'object' && user !== null && '_id' in user) {
            const u = user as { _id: Types.ObjectId; name?: string };
            return { id: u._id.toString(), name: u.name };
        }
        return { id: String(user) };
    }

    private toView(d: ProductTemplateDocument): ProductTemplateView {
        return {
            id: d._id.toString(),
            name: d.name,
            status: d.status,
            bgImage: d.bgImage,
            frontImage: d.frontImage,
            cardBg: d.cardBg,
            buttonBg: d.buttonBg,
            buttonText: d.buttonText,
            textPrimary: d.textPrimary,
            textSecondary: d.textSecondary,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            createdBy: this.toAudit(d.createdBy),
            updatedBy: this.toAudit(d.updatedBy),
        };
    }

    private isDuplicate(e: unknown): boolean {
        return typeof e === 'object' && e !== null && (e as { code?: number }).code === 11000;
    }

    private async removeFile(url?: string): Promise<void> {
        if (!url) return;
        const path = resolve(process.cwd(), url.replace(/^\/+/, ''));
        const rel = relative(process.cwd(), path);
        if (rel.startsWith('..') || isAbsolute(rel)) return; // never delete outside the app folder
        try {
            await unlink(path);
        } catch (e) {
            if ((e as { code?: string }).code !== 'ENOENT') this.logger.warn('Unable to remove template image');
        }
    }

    private async cleanup(files?: TemplateFiles) {
        for (const f of [files?.bgImage?.[0], files?.frontImage?.[0]]) {
            if (f) await this.removeFile(`${TEMPLATE_URL_PREFIX}/${f.filename}`);
        }
    }

    // ---------- CRUD ----------

    async create(
        dto: CreateProductTemplateDto,
        files: TemplateFiles | undefined,
        userId: string,
    ): Promise<ProductTemplateView> {
        let uid: Types.ObjectId;
        try {
            uid = this.userId(userId);
        } catch (e) {
            await this.cleanup(files);
            throw e;
        }

        const bg = files?.bgImage?.[0];
        const front = files?.frontImage?.[0];

        try {
            const doc = await this.model.create({
                name: dto.name,
                status: dto.status as TemplateStatus,
                bgImage: bg ? `${TEMPLATE_URL_PREFIX}/${bg.filename}` : '',
                frontImage: front ? `${TEMPLATE_URL_PREFIX}/${front.filename}` : '',
                ...Object.fromEntries(COLORS.map((c) => [c, (dto[c] ?? '').trim()])),
                createdBy: uid,
                updatedBy: uid,
            });
            await doc.populate(AUDIT_POPULATE);
            return this.toView(doc);
        } catch (e) {
            await this.cleanup(files);
            if (this.isDuplicate(e)) throw new ConflictException('Template name already exists');
            throw e;
        }
    }

    async findAll(page: number, limit: number, search: string): Promise<ProductTemplatePage> {
        const filter: Record<string, any> = {};
        const q = search.trim();
        if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

        const [docs, total] = await Promise.all([
            this.model
                .find(filter)
                .populate(AUDIT_POPULATE)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .exec(),
            this.model.countDocuments(filter).exec(),
        ]);

        return {
            data: docs.map((d) => this.toView(d)),
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        };
    }

    async findById(id: string): Promise<ProductTemplateView> {
        const doc = await this.model.findById(id).populate(AUDIT_POPULATE).exec();
        if (!doc) throw new NotFoundException('Product template not found');
        return this.toView(doc);
    }

    async update(
        id: string,
        dto: UpdateProductTemplateDto,
        files: TemplateFiles | undefined,
        userId: string,
    ): Promise<ProductTemplateView> {
        let uid: Types.ObjectId;
        try {
            uid = this.userId(userId);
        } catch (e) {
            await this.cleanup(files);
            throw e;
        }

        const doc = await this.model.findById(id).exec();
        if (!doc) {
            await this.cleanup(files);
            throw new NotFoundException('Product template not found');
        }

        const oldBg = doc.bgImage;
        const oldFront = doc.frontImage;
        const bg = files?.bgImage?.[0];
        const front = files?.frontImage?.[0];

        if (dto.name !== undefined) doc.name = dto.name;
        if (dto.status !== undefined) doc.status = dto.status as TemplateStatus;
        for (const c of COLORS) if (dto[c] !== undefined) doc[c] = dto[c]!.trim();
        if (bg) doc.bgImage = `${TEMPLATE_URL_PREFIX}/${bg.filename}`;
        if (front) doc.frontImage = `${TEMPLATE_URL_PREFIX}/${front.filename}`;
        doc.updatedBy = uid;

        try {
            await doc.save();
        } catch (e) {
            await this.cleanup(files);
            if (this.isDuplicate(e)) throw new ConflictException('Template name already exists');
            throw e;
        }

        // new image saved: delete the replaced files
        if (bg) await this.removeFile(oldBg);
        if (front) await this.removeFile(oldFront);

        await doc.populate(AUDIT_POPULATE);
        return this.toView(doc);
    }
}