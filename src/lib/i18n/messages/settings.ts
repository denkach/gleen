import { defineMessages } from '../catalog';

export type SettingsErrorCode =
  'invalid_locale' | 'profile_update_failed' | 'session_expired';

export const settingsMessages = defineMessages({
  en: {
    metadata: {
      title: 'Settings — Gleen',
      description: 'Manage your Gleen language preferences.',
    },
    page: {
      eyebrow: 'Your account',
      title: 'Settings',
      description:
        'Choose languages for Gleen and for new knowledge artifacts.',
    },
    language: {
      title: 'Language preferences',
      interface: {
        title: 'Interface language',
        description:
          'Changes the language used by Gleen controls and navigation.',
        label: 'Gleen controls language',
        save: 'Save interface language',
      },
      output: {
        title: 'Generated-content language',
        description:
          'Affects future generated content only. It does not change Gleen controls.',
        label: 'Future generated content language',
        save: 'Save output language',
      },
      note: {
        title: 'Settings apply only to new materials',
        description: 'Previous analyses and documents remain unchanged.',
        privacy: 'Language preferences are stored only for your account.',
      },
      saving: 'Saving…',
      saved: 'Saved.',
      loadError: 'We could not load your language preferences.',
      retry: 'Try again',
      errors: {
        invalid_locale: 'Choose one of the available languages.',
        profile_update_failed: 'We could not save this language. Try again.',
        session_expired: 'Your session has expired. Sign in and try again.',
      },
    },
  },
  uk: {
    metadata: {
      title: 'Налаштування — Gleen',
      description: 'Керуйте мовними налаштуваннями Gleen.',
    },
    page: {
      eyebrow: 'Ваш обліковий запис',
      title: 'Налаштування',
      description: 'Виберіть мови для Gleen і нових матеріалів.',
    },
    language: {
      title: 'Мовні налаштування',
      interface: {
        title: 'Мова інтерфейсу',
        description: 'Змінює мову елементів керування та навігації Gleen.',
        label: 'Мова елементів керування Gleen',
        save: 'Зберегти мову інтерфейсу',
      },
      output: {
        title: 'Мова створеного контенту',
        description:
          'Впливає лише на майбутній створений контент. Елементи керування Gleen не змінюються.',
        label: 'Мова майбутнього створеного контенту',
        save: 'Зберегти мову результатів',
      },
      note: {
        title: 'Налаштування застосовуються лише до нових матеріалів',
        description: 'Попередні аналізи й документи залишаться без змін.',
        privacy:
          'Мовні налаштування зберігаються лише для вашого облікового запису.',
      },
      saving: 'Зберігаємо…',
      saved: 'Збережено.',
      loadError: 'Не вдалося завантажити мовні налаштування.',
      retry: 'Спробувати ще раз',
      errors: {
        invalid_locale: 'Виберіть одну з доступних мов.',
        profile_update_failed: 'Не вдалося зберегти мову. Спробуйте ще раз.',
        session_expired: 'Ваш сеанс завершено. Увійдіть знову.',
      },
    },
  },
  ru: {
    metadata: {
      title: 'Настройки — Gleen',
      description: 'Управляйте языковыми настройками Gleen.',
    },
    page: {
      eyebrow: 'Ваш аккаунт',
      title: 'Настройки',
      description: 'Выберите языки для Gleen и новых материалов.',
    },
    language: {
      title: 'Языковые настройки',
      interface: {
        title: 'Язык интерфейса',
        description:
          'Меняет язык элементов управления, навигации и системных сообщений Gleen.',
        label: 'Язык элементов управления Gleen',
        save: 'Сохранить язык интерфейса',
      },
      output: {
        title: 'Язык создаваемого контента',
        description:
          'Влияет только на будущие материалы, тексты и результаты анализа. Интерфейс Gleen не меняется.',
        label: 'Язык будущего создаваемого контента',
        save: 'Сохранить язык результатов',
      },
      note: {
        title: 'Настройки применяются только к новым материалам',
        description: 'Предыдущие анализы и документы останутся без изменений.',
        privacy:
          'Языковые настройки сохраняются только для вашего аккаунта и не передаются другим пользователям.',
      },
      saving: 'Сохраняем…',
      saved: 'Сохранено.',
      loadError: 'Не удалось загрузить языковые настройки.',
      retry: 'Попробовать снова',
      errors: {
        invalid_locale: 'Выберите один из доступных языков.',
        profile_update_failed: 'Не удалось сохранить язык. Попробуйте ещё раз.',
        session_expired: 'Сеанс завершён. Войдите снова.',
      },
    },
  },
  es: {
    metadata: {
      title: 'Ajustes — Gleen',
      description: 'Gestiona tus preferencias de idioma de Gleen.',
    },
    page: {
      eyebrow: 'Tu cuenta',
      title: 'Ajustes',
      description: 'Elige idiomas para Gleen y para los nuevos materiales.',
    },
    language: {
      title: 'Preferencias de idioma',
      interface: {
        title: 'Idioma de la interfaz',
        description:
          'Cambia el idioma de los controles y la navegación de Gleen.',
        label: 'Idioma de los controles de Gleen',
        save: 'Guardar idioma de la interfaz',
      },
      output: {
        title: 'Idioma del contenido generado',
        description:
          'Afecta solo al contenido generado futuro. No cambia los controles de Gleen.',
        label: 'Idioma del contenido generado futuro',
        save: 'Guardar idioma de salida',
      },
      note: {
        title: 'Los ajustes se aplican solo a los materiales nuevos',
        description:
          'Los análisis y documentos anteriores no sufrirán cambios.',
        privacy: 'Las preferencias de idioma se guardan solo para tu cuenta.',
      },
      saving: 'Guardando…',
      saved: 'Guardado.',
      loadError: 'No hemos podido cargar tus preferencias de idioma.',
      retry: 'Intentarlo de nuevo',
      errors: {
        invalid_locale: 'Elige uno de los idiomas disponibles.',
        profile_update_failed:
          'No hemos podido guardar este idioma. Inténtalo de nuevo.',
        session_expired: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
      },
    },
  },
  de: {
    metadata: {
      title: 'Einstellungen — Gleen',
      description: 'Verwalte deine Spracheinstellungen für Gleen.',
    },
    page: {
      eyebrow: 'Dein Konto',
      title: 'Einstellungen',
      description: 'Wähle Sprachen für Gleen und neue Inhalte.',
    },
    language: {
      title: 'Spracheinstellungen',
      interface: {
        title: 'Sprache der Oberfläche',
        description:
          'Ändert die Sprache der Gleen-Steuerelemente und der Navigation.',
        label: 'Sprache der Gleen-Steuerelemente',
        save: 'Oberflächensprache speichern',
      },
      output: {
        title: 'Sprache generierter Inhalte',
        description:
          'Beeinflusst nur künftig generierte Inhalte. Gleen-Steuerelemente ändern sich nicht.',
        label: 'Sprache künftig generierter Inhalte',
        save: 'Ausgabesprache speichern',
      },
      note: {
        title: 'Einstellungen gelten nur für neue Inhalte',
        description: 'Vorhandene Analysen und Dokumente bleiben unverändert.',
        privacy: 'Spracheinstellungen werden nur für dein Konto gespeichert.',
      },
      saving: 'Speichern…',
      saved: 'Gespeichert.',
      loadError: 'Deine Spracheinstellungen konnten nicht geladen werden.',
      retry: 'Erneut versuchen',
      errors: {
        invalid_locale: 'Wähle eine der verfügbaren Sprachen.',
        profile_update_failed:
          'Diese Sprache konnte nicht gespeichert werden. Versuche es erneut.',
        session_expired: 'Deine Sitzung ist abgelaufen. Melde dich erneut an.',
      },
    },
  },
});

export type SettingsCopy = (typeof settingsMessages)['en'];

export function settingsErrorMessage(
  copy: SettingsCopy,
  code: SettingsErrorCode,
) {
  return copy.language.errors[code];
}
