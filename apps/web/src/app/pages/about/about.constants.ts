import { AboutFaqItem, AboutFeature } from './about.interfaces';

// Titles, texts, questions, and answers are translation keys.
export const ABOUT_FEATURES: AboutFeature[] = [
  { icon: 'calendar_month', title: 'about.features.calendar.title', text: 'about.features.calendar.text' },
  { icon: 'cake', title: 'about.features.upcoming.title', text: 'about.features.upcoming.text' },
  { icon: 'edit_note', title: 'about.features.notes.title', text: 'about.features.notes.text' },
  { icon: 'group', title: 'about.features.people.title', text: 'about.features.people.text' },
  { icon: 'notifications_active', title: 'about.features.notifications.title', text: 'about.features.notifications.text' },
  { icon: 'sync', title: 'about.features.googleCalendar.title', text: 'about.features.googleCalendar.text' },
  { icon: 'smartphone', title: 'about.features.anyDevice.title', text: 'about.features.anyDevice.text' },
];

export const ABOUT_FAQ: AboutFaqItem[] = [
  { question: 'about.faq.account.question', answer: 'about.faq.account.answer' },
  { question: 'about.faq.storage.question', answer: 'about.faq.storage.answer' },
  { question: 'about.faq.phone.question', answer: 'about.faq.phone.answer' },
  { question: 'about.faq.addBirthday.question', answer: 'about.faq.addBirthday.answer' },
  { question: 'about.faq.noYear.question', answer: 'about.faq.noYear.answer' },
  { question: 'about.faq.reminders.question', answer: 'about.faq.reminders.answer' },
  { question: 'about.faq.googleCalendar.question', answer: 'about.faq.googleCalendar.answer' },
];
