import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import en from './locales/en.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import es from './locales/es.json';

// Language display names and flags
export const languages = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' }
};

// Get stored language or browser language
const getInitialLanguage = () => {
  const stored = localStorage.getItem('language');
  if (stored && languages[stored]) return stored;
  
  const browserLang = navigator.language.split('-')[0];
  if (languages[browserLang]) return browserLang;
  
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      ja: { translation: ja },
      es: { translation: es }
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false
    }
  });

// Save language preference when changed
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
});

export default i18n;