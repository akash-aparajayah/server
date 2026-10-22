export interface AuditUserView {
    id: string;
    name?: string;
}

export interface ProductTemplateView {
    id: string;
    name: string;
    status: string;
    bgImage: string;
    frontImage: string;
    cardBg: string;
    buttonBg: string;
    buttonText: string;
    textPrimary: string;
    textSecondary: string;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: AuditUserView;
    updatedBy?: AuditUserView;
}

export interface ProductTemplatePage {
    data: ProductTemplateView[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}