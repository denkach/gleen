import { defineMessages } from '../catalog';

export const sharedMessages = defineMessages({
  en: {
    localeSwitcher: {
      label: 'Language',
      menuLabel: 'Choose interface language',
      saving: 'Saving language…',
      errors: {
        invalidLocale: 'Choose a supported language.',
        profileUpdateFailed: 'We could not save your language. Try again.',
      },
    },
  },
  uk: {
    localeSwitcher: {
      label: 'Мова',
      menuLabel: 'Виберіть мову інтерфейсу',
      saving: 'Зберігаємо мову…',
      errors: {
        invalidLocale: 'Виберіть підтримувану мову.',
        profileUpdateFailed: 'Не вдалося зберегти мову. Спробуйте ще раз.',
      },
    },
  },
  ru: {
    localeSwitcher: {
      label: 'Язык',
      menuLabel: 'Выберите язык интерфейса',
      saving: 'Сохраняем язык…',
      errors: {
        invalidLocale: 'Выберите поддерживаемый язык.',
        profileUpdateFailed: 'Не удалось сохранить язык. Попробуйте ещё раз.',
      },
    },
  },
  es: {
    localeSwitcher: {
      label: 'Idioma',
      menuLabel: 'Elige el idioma de la interfaz',
      saving: 'Guardando idioma…',
      errors: {
        invalidLocale: 'Elige un idioma compatible.',
        profileUpdateFailed:
          'No hemos podido guardar el idioma. Inténtalo de nuevo.',
      },
    },
  },
  de: {
    localeSwitcher: {
      label: 'Sprache',
      menuLabel: 'Sprache der Benutzeroberfläche wählen',
      saving: 'Sprache wird gespeichert…',
      errors: {
        invalidLocale: 'Wähle eine unterstützte Sprache.',
        profileUpdateFailed:
          'Die Sprache konnte nicht gespeichert werden. Bitte versuche es erneut.',
      },
    },
  },
});

export type LocaleSwitcherCopy = (typeof sharedMessages)['en'];
