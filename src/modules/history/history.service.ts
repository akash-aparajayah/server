import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    StripeHistory,
    StripeHistoryDocument,
} from './schemas/stripe-history.schema.js';
import {
    SubEntity,
    SubEntityDocument,
} from '../sub-entities/schemas/sub-entity.schema.js';
import { ApiKeyType } from '../api-keys/schemas/api-key.schema.js';
import { EntitiesService } from '../entities/entities.service.js';
import { SubEntitiesService } from '../sub-entities/sub-entities.service.js';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';
import { parseStored, toStored } from './history.util.js';

export interface RecordInput {
    keyId: string;
    subEntityId: string;
    environment: ApiKeyType;
    action: string;
    status: 'success' | 'failed';
    statusCode: number | null;
    errorMessage: string | null;
    entityType: string | null;
    stripeObjectId: string | null;
    customerId: string | null;
    amount: number | null;
    currency: string | null;
    requestBody: unknown;
    responseBody: unknown;
}

export interface EnvStats {
    calls: number;
    failed: number;
    lastAt: Date | null;
    paid: { currency: string | null; amount: number }[];
}
type EnvPair = { sandbox: EnvStats; live: EnvStats };

const emptyStats = (): EnvStats => ({ calls: 0, failed: 0, lastAt: null, paid: [] });
const emptyPair = (): EnvPair => ({ sandbox: emptyStats(), live: emptyStats() });

@Injectable()
export class HistoryService {
    constructor(
        @InjectModel(StripeHistory.name)
        private historyModel: Model<StripeHistoryDocument>,
        @InjectModel(SubEntity.name)
        private subEntityModel: Model<SubEntityDocument>,
        private readonly entities: EntitiesService,
        private readonly subEntities: SubEntitiesService,
    ) { }

    // called by HistoryInterceptor (no logged-in user here)
    async record(p: RecordInput): Promise<void> {
        const sub = await this.subEntityModel
            .findById(p.subEntityId)
            .select('entity')
            .lean()
            .exec();
        await this.historyModel.create({
            entityId: sub?.entity ?? null,
            subEntityId: p.subEntityId,
            keyId: p.keyId,
            environment: p.environment,
            action: p.action,
            entityType: p.entityType,
            stripeObjectId: p.stripeObjectId,
            customerId: p.customerId,
            status: p.status,
            statusCode: p.statusCode,
            errorMessage: p.errorMessage,
            amount: p.amount,
            currency: p.currency,
            requestBody: toStored(p.requestBody),
            responseBody: toStored(p.responseBody),
        });
    }

    // counts per id and environment, plus succeeded payment totals
    private async stats(
        match: Record<string, any>,
        field: 'entityId' | 'subEntityId',
    ): Promise<Map<string, EnvPair>> {
        const [calls, paid] = await Promise.all([
            this.historyModel.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: { id: `$${field}`, env: '$environment' },
                        calls: { $sum: 1 },
                        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                        lastAt: { $max: '$createdAt' },
                    },
                },
            ]),
            this.historyModel.aggregate([
                {
                    $match: {
                        ...match,
                        action: 'create-payment',
                        status: 'success',
                        amount: { $ne: null },
                    },
                },
                {
                    $group: {
                        _id: { id: `$${field}`, env: '$environment', currency: '$currency' },
                        amount: { $sum: '$amount' },
                    },
                },
            ]),
        ]);

        const out = new Map<string, EnvPair>();
        const slot = (id: string, env: ApiKeyType): EnvStats => {
            if (!out.has(id)) out.set(id, emptyPair());
            return out.get(id)![env];
        };
        for (const c of calls as any[]) {
            const s = slot(String(c._id.id), c._id.env);
            s.calls = c.calls;
            s.failed = c.failed;
            s.lastAt = c.lastAt;
        }
        for (const p of paid as any[]) {
            slot(String(p._id.id), p._id.env).paid.push({
                currency: p._id.currency ?? null,
                amount: p.amount,
            });
        }
        return out;
    }

    // page 1: clients (entities) the user can see
    async clients(user: AuthUser) {
        const entities = await this.entities.findAll(user);
        if (!entities.length) return [];
        const stats = await this.stats(
            { entityId: { $in: entities.map((e) => String(e._id)) } },
            'entityId',
        );
        return entities.map((e) => ({
            id: e._id,
            name: e.name,
            isActive: e.isActive,
            environmentsCount: e.subEntities?.length ?? 0,
            ...(stats.get(String(e._id)) ?? emptyPair()),
        }));
    }

    // page 2: environments (sub entities) of one client
    async environments(entityId: string, user: AuthUser) {
        await this.entities.findOne(entityId, user); // owner check
        const subs = await this.subEntityModel
            .find({ entity: entityId })
            .select('name isActive')
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        if (!subs.length) return [];
        const stats = await this.stats(
            { subEntityId: { $in: subs.map((s) => String(s._id)) } },
            'subEntityId',
        );
        return subs.map((s) => ({
            id: s._id,
            name: s.name,
            isActive: s.isActive,
            ...(stats.get(String(s._id)) ?? emptyPair()),
        }));
    }

    // page 3: calls of one environment (Sandbox / Live tab)
    async list(
        user: AuthUser,
        q: {
            subEntityId: string;
            env?: string;
            action?: string;
            status?: string;
            from?: string;
            to?: string;
            page?: string | number;
            limit?: string | number;
        },
    ) {
        await this.subEntities.findOne(q.subEntityId, user); // owner check
        const page = Math.max(1, Number(q.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));

        const filter: Record<string, any> = {
            subEntityId: q.subEntityId,
        };
        if (q.env === ApiKeyType.SANDBOX || q.env === ApiKeyType.LIVE) {
            filter.environment = q.env;
        }
        if (q.action) filter.action = q.action;
        if (q.status === 'success' || q.status === 'failed') filter.status = q.status;

        const range: Record<string, Date> = {};
        const from = q.from ? new Date(q.from) : null;
        const to = q.to ? new Date(q.to) : null;
        if (from && !isNaN(from.getTime())) range.$gte = from;
        if (to && !isNaN(to.getTime())) {
            if (q.to && q.to.length <= 10) to.setUTCHours(23, 59, 59, 999); // date only: include the whole day
            range.$lte = to;
        }
        if (Object.keys(range).length) filter.createdAt = range;

        const [items, total] = await Promise.all([
            this.historyModel
                .find(filter)
                .select('-requestBody -responseBody')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
                .exec(),
            this.historyModel.countDocuments(filter).exec(),
        ]);
        return { items, total, page, limit };
    }

    // drawer: one call with request and response
    async findOne(id: string, user: AuthUser) {
        const row = await this.historyModel.findById(id).lean().exec();
        if (!row) throw new NotFoundException('History record not found');
        await this.subEntities.findOne(String(row.subEntityId), user); // owner check
        return {
            ...row,
            requestBody: parseStored(row.requestBody),
            responseBody: parseStored(row.responseBody),
        };
    }
}