import { MarkupType } from '../../modules/margins/schemas/margin.schema.js';

export const round2 = (n: number) => Math.round(n * 100) / 100;

export interface MarginInput {
  wholesalePrice: number;
  markupType: MarkupType;
  markupValue: number;
}

export function calcMargin(i: MarginInput) {
  const markupAmount =
    i.markupType === MarkupType.Flat
      ? i.markupValue
      : (i.wholesalePrice * i.markupValue) / 100;

  return {
    markupAmount: round2(markupAmount),
    markupPercent: round2((markupAmount / i.wholesalePrice) * 100),
    buyRate: round2(i.wholesalePrice + markupAmount),
  };
}
