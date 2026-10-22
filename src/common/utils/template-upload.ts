import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname } from 'path';

export const TEMPLATE_URL_PREFIX = '/uploads/product-templates';
const DIR = 'uploads/product-templates';
const OK = ['image/png', 'image/jpeg'];

export const templateUploadOptions = {
    storage: diskStorage({
        destination: (_req, _file, cb) => {
            if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
            cb(null, DIR);
        },
        filename: (_req, file, cb) =>
            cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
    }),
    fileFilter: (_req: any, file: Express.Multer.File, cb: any) =>
        OK.includes(file.mimetype)
            ? cb(null, true)
            : cb(new BadRequestException('Only JPEG or PNG images are allowed'), false),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB, same as the form
};