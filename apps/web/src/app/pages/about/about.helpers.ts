import { AppTranslateService } from '@birthday/web-shared-i18n';
import { ABOUT_FAQ } from './about.constants';
import { AboutFaqItem } from './about.interfaces';

// schema.org FAQPage built from the same items as the page, so the markup always matches the visible answers.
export function buildAboutFaqStructuredData(translator: AppTranslateService): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ABOUT_FAQ.map(({ question, answer }: AboutFaqItem) => ({
      '@type': 'Question',
      name: translator.translate(question),
      acceptedAnswer: { '@type': 'Answer', text: translator.translate(answer) },
    })),
  };
}
