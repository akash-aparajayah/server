// common/utils/sanitize.util.ts
import sanitizeHtml from 'sanitize-html';

export const sanitizeRichText = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'img', 'u']),
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes },
  });