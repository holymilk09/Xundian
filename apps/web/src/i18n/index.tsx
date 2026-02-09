'use client';

import i18n from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import en from './en.json';
import zh from './zh.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export default i18n;
