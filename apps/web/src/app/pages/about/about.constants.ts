import { AboutFaqItem, AboutFeature } from './about.interfaces';

export const ABOUT_FEATURES: AboutFeature[] = [
  {
    icon: 'calendar_month',
    title: 'Month and year calendar',
    text: 'See every birthday on a month calendar, or switch to the year view to plan ahead.',
  },
  {
    icon: 'cake',
    title: 'Upcoming birthdays',
    text: 'Check who celebrates next, how many days are left, and how old they turn.',
  },
  {
    icon: 'edit_note',
    title: 'Relationship and notes',
    text: 'Save who each person is to you and keep notes, such as gift ideas.',
  },
  {
    icon: 'group',
    title: 'People list and search',
    text: 'Keep everyone in one sortable list and find a person in seconds.',
  },
  {
    icon: 'sync',
    title: 'Google Calendar sync',
    text: 'Show your birthdays in Google Calendar and bring in birthdays from your Google contacts and calendar.',
  },
  {
    icon: 'smartphone',
    title: 'No account, any device',
    text: 'Start right away in any browser, add it to your phone home screen, and sign in with Google to sync.',
  },
];

export const ABOUT_FAQ: AboutFaqItem[] = [
  {
    question: 'Do I need an account?',
    answer: 'No. You can add birthdays right away without signing in. Sign in with Google when you want to keep them in your account.',
  },
  {
    question: 'Where are my birthdays stored?',
    answer:
      'Without an account, birthdays are saved in this browser only. After you sign in with Google, they are stored in your account, and the birthdays you added before signing in can be moved there.',
  },
  {
    question: 'Does it work on my phone?',
    answer: 'Yes. Birthdly works in any modern mobile browser, and you can add it to your home screen to open it like an app.',
  },
  { question: 'How do I add a birthday?', answer: 'Open the calendar, press the + button, and enter a name and a date.' },
  {
    question: 'Can I add a birthday without the birth year?',
    answer: 'Yes. Leave the year empty, and Birthdly shows the birthday every year without the age.',
  },
  {
    question: 'Can I sync birthdays with Google Calendar?',
    answer:
      'Yes. Sign in with Google and connect Google Calendar in Settings. Birthdly shows your birthdays in Google Calendar and brings in birthdays from your Google contacts and calendar.',
  },
];

// schema.org FAQPage built from the same items as the page, so the markup always matches the visible answers.
export const ABOUT_FAQ_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: ABOUT_FAQ.map(({ question, answer }: AboutFaqItem) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
};
