import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApiDoc, ApiDocDocument } from './schemas/api-doc.schema.js';
import { CreateApiDocDto } from './dto/create-api-doc.dto.js';
import { UpdateApiDocDto } from './dto/update-api-doc.dto.js';

const POPULATE = [
    { path: 'providerId', select: 'name providerCode' },
    { path: 'createdBy', select: 'name' },
    { path: 'updatedBy', select: 'name' },
];

@Injectable()
export class ApiDocsService {
    constructor(@InjectModel(ApiDoc.name) private readonly model: Model<ApiDocDocument>) { }

    private oid(id: string, label: string): Types.ObjectId {
        if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${label}`);
        return new Types.ObjectId(id);
    }

    private audit(user: unknown) {
        if (!user || typeof user !== 'object') return undefined;
        const u = user as { _id: Types.ObjectId; name?: string };
        return { id: u._id.toString(), name: u.name };
    }

    private toView(doc: ApiDocDocument) {
        const p = doc.providerId as unknown as { _id: Types.ObjectId; name?: string; providerCode?: string } | null;
        return {
            id: doc._id.toString(),
            name: doc.name,
            method: doc.method,
            url: doc.url,
            service: doc.service ?? '',
            description: doc.description,
            providerId: p ? p._id.toString() : null,
            providerName: p?.name ?? null,
            headers: doc.headers,
            body: doc.body,
            responses: doc.responses,
            requestExample: doc.requestExample,
            responseExample: doc.responseExample,
            isActive: doc.isActive,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            createdBy: this.audit(doc.createdBy),
            updatedBy: this.audit(doc.updatedBy),
        };
    }

    async findAll() {
        const docs = await this.model.find().populate(POPULATE).sort({ createdAt: -1 }).exec();
        return docs.map((d) => this.toView(d));
    }

    async findById(id: string) {
        this.oid(id, 'documentation ID');
        const doc = await this.model.findById(id).populate(POPULATE).exec();
        if (!doc) throw new NotFoundException('Documentation not found');
        return this.toView(doc);
    }

    async create(dto: CreateApiDocDto, userId: string) {
        const u = this.oid(userId, 'user ID');
        const doc = await this.model.create({
            ...dto,
            providerId: dto.providerId ?? null,
            createdBy: u,
            updatedBy: u,
        });
        return this.findById(doc._id.toString());
    }

    async update(id: string, dto: UpdateApiDocDto, userId: string) {
        this.oid(id, 'documentation ID');
        const u = this.oid(userId, 'user ID');
        const doc = await this.model.findById(id).exec();
        if (!doc) throw new NotFoundException('Documentation not found');
        Object.assign(doc, dto);
        doc.updatedBy = u;
        await doc.save();
        return this.findById(id);
    }

    async setStatus(id: string, isActive: boolean, userId: string) {
        this.oid(id, 'documentation ID');
        const u = this.oid(userId, 'user ID');
        const doc = await this.model.findByIdAndUpdate(id, { isActive, updatedBy: u }, { new: true }).exec();
        if (!doc) throw new NotFoundException('Documentation not found');
        return this.findById(id);
    }

    async remove(id: string) {
        this.oid(id, 'documentation ID');
        const doc = await this.model.findByIdAndDelete(id).exec();
        if (!doc) throw new NotFoundException('Documentation not found');
        return { deleted: true };
    }
}