import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema.js';
import { EntitiesService } from '../entities/entities.service.js';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class CustomersService {
    constructor(
        @InjectModel(Customer.name) private readonly model: Model<CustomerDocument>,
        private readonly entities: EntitiesService,
    ) { }

    // called by HistoryService after a successful create-customer / update-customer
    async upsertFromStripe(
        c: Record<string, any>,
        ctx: { entityId: Types.ObjectId | null; subEntityId: string; live: boolean },
    ) {
        await this.model
            .updateOne(
                { stripeId: c.id },
                {
                    $set: {
                        name: c.name ?? null,
                        email: c.email ?? null,
                        phone: c.phone ?? null,
                        livemode: typeof c.livemode === 'boolean' ? c.livemode : ctx.live,
                    },
                    $setOnInsert: { entityId: ctx.entityId, subEntityId: ctx.subEntityId },
                },
                { upsert: true },
            )
            .exec();
    }

    async list(
        user: AuthUser,
        q: { mode?: string; search?: string; page?: string | number; limit?: string | number },
    ) {
        const page = Math.max(1, Number(q.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(q.limit) || 10));

        // admin sees all clients, others only their own
        const entities = await this.entities.findAll(user);
        if (!entities.length) return { items: [], total: 0, page, limit };

        const ids = entities.map((e) => String(e._id));
        const filter: Record<string, any> = {
            $or: [
                { entityId: { $in: ids.map((id) => new Types.ObjectId(id)) } },
                { $expr: { $in: [{ $toString: '$entityId' }, ids] } },
            ],
        };
        if (q.mode === 'live') filter.livemode = true;
        if (q.mode === 'sandbox') filter.livemode = false;
        const t = q.search?.trim();
        if (t) {
            const re = new RegExp(esc(t), 'i');
            filter.$and = [{ $or: [{ name: re }, { email: re }, { phone: re }, { stripeId: re }] }];
        }

        const [items, total] = await Promise.all([
            this.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
            this.model.countDocuments(filter).exec(),
        ]);
        return { items, total, page, limit };
    }
}