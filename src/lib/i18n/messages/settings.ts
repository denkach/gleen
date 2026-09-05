import { defineMessages } from '../catalog';

export type SettingsErrorCode =
  | 'invalid_locale'
  | 'invalid_summary_mode'
  | 'profile_update_failed'
  | 'session_expired';

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
      saving: 'Saving…',
      saved: 'Saved.',
      loadError: 'We could not load your language preferences.',
      retry: 'Try again',
      errors: {
        invalid_locale: 'Choose one of the available languages.',
        invalid_summary_mode: 'Choose one of the available summary modes.',
        profile_update_failed: 'We could not save this language. Try again.',
        session_expired: 'Your session has expired. Sign in and try again.',
      },
    },
    summary: {
      title: 'Summary default',
      description:
        'Choose the default summary depth for new analyses. You can override it per video.',
      label: 'Default summary mode',
      save: 'Save summary mode',
      modes: {
        compact: {
          title: 'Compact',
          description:
            'The shortest useful version with the main conclusions and important caveats.',
        },
        balanced: {
          title: 'Balanced',
          description:
            'A complete everyday summary with arguments, examples, and context. This is the default.',
        },
        deep: {
          title: 'Deep',
          description:
            'A study-ready explanation with full structure, examples, exceptions, and practical conclusions.',
        },
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
      saving: 'Зберігаємо…',
      saved: 'Збережено.',
      loadError: 'Не вдалося завантажити мовні налаштування.',
      retry: 'Спробувати ще раз',
      errors: {
        invalid_locale: 'Виберіть одну з доступних мов.',
        invalid_summary_mode: 'Виберіть один із доступних режимів конспекту.',
        profile_update_failed: 'Не вдалося зберегти мову. Спробуйте ще раз.',
        session_expired: 'Ваш сеанс завершено. Увійдіть знову.',
      },
    },
    summary: {
      title: 'Конспект за замовчуванням',
      description:
        'Виберіть глибину конспекту для нових аналізів. Її можна змінити для окремого відео.',
      label: 'Режим конспекту за замовчуванням',
      save: 'Зберегти режим конспекту',
      modes: {
        compact: {
          title: 'Компактний',
          description:
            'Найкоротша корисна версія з головними висновками й важливими застереженнями.',
        },
        balanced: {
          title: 'Збалансований',
          description:
            'Повний конспект на щодень з аргументами, прикладами й контекстом. Режим за замовчуванням.',
        },
        deep: {
          title: 'Глибокий',
          description:
            'Готове до навчання пояснення з повною структурою, прикладами, винятками й практичними висновками.',
        },
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
        description: 'Меняет язык элементов управления и навигации Gleen.',
        label: 'Язык элементов управления Gleen',
        save: 'Сохранить язык интерфейса',
      },
      output: {
        title: 'Язык создаваемого контента',
        description:
          'Влияет только на будущий создаваемый контент. Элементы управления Gleen не меняются.',
        label: 'Язык будущего создаваемого контента',
        save: 'Сохранить язык результатов',
      },
      saving: 'Сохраняем…',
      saved: 'Сохранено.',
      loadError: 'Не удалось загрузить языковые настройки.',
      retry: 'Попробовать снова',
      errors: {
        invalid_locale: 'Выберите один из доступных языков.',
        invalid_summary_mode: 'Выберите один из доступных режимов конспекта.',
        profile_update_failed: 'Не удалось сохранить язык. Попробуйте ещё раз.',
        session_expired: 'Сеанс завершён. Войдите снова.',
      },
    },
    summary: {
      title: 'Конспект по умолчанию',
      description:
        'Выберите глубину конспекта для новых анализов. Её можно изменить для отдельного видео.',
      label: 'Режим конспекта по умолчанию',
      save: 'Сохранить режим конспекта',
      modes: {
        compact: {
          title: 'Компактный',
          description:
            'Самая короткая полезная версия с главными выводами и важными оговорками.',
        },
        balanced: {
          title: 'Сбалансированный',
          description:
            'Полный конспект на каждый день с аргументами, примерами и контекстом. Режим по умолчанию.',
        },
        deep: {
          title: 'Глубокий',
          description:
            'Готовое к изучению объяснение с полной структурой, примерами, исключениями и практическими выводами.',
        },
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
      saving: 'Guardando…',
      saved: 'Guardado.',
      loadError: 'No hemos podido cargar tus preferencias de idioma.',
      retry: 'Intentarlo de nuevo',
      errors: {
        invalid_locale: 'Elige uno de los idiomas disponibles.',
        invalid_summary_mode: 'Elige uno de los modos de resumen disponibles.',
        profile_update_failed:
          'No hemos podido guardar este idioma. Inténtalo de nuevo.',
        session_expired: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
      },
    },
    summary: {
      title: 'Resumen predeterminado',
      description:
        'Elige la profundidad predeterminada de los nuevos análisis. Puedes cambiarla para cada vídeo.',
      label: 'Modo de resumen predeterminado',
      save: 'Guardar modo de resumen',
      modes: {
        compact: {
          title: 'Compacto',
          description:
            'La versión útil más breve, con las conclusiones y salvedades importantes.',
        },
        balanced: {
          title: 'Equilibrado',
          description:
            'Un resumen completo para el día a día, con argumentos, ejemplos y contexto. Es el predeterminado.',
        },
        deep: {
          title: 'Profundo',
          description:
            'Una explicación lista para estudiar, con estructura, ejemplos, excepciones y conclusiones prácticas.',
        },
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
      saving: 'Speichern…',
      saved: 'Gespeichert.',
      loadError: 'Deine Spracheinstellungen konnten nicht geladen werden.',
      retry: 'Erneut versuchen',
      errors: {
        invalid_locale: 'Wähle eine der verfügbaren Sprachen.',
        invalid_summary_mode:
          'Wähle einen der verfügbaren Zusammenfassungsmodi.',
        profile_update_failed:
          'Diese Sprache konnte nicht gespeichert werden. Versuche es erneut.',
        session_expired: 'Deine Sitzung ist abgelaufen. Melde dich erneut an.',
      },
    },
    summary: {
      title: 'Standardzusammenfassung',
      description:
        'Wähle die standardmäßige Tiefe für neue Analysen. Du kannst sie pro Video ändern.',
      label: 'Standardmodus der Zusammenfassung',
      save: 'Zusammenfassungsmodus speichern',
      modes: {
        compact: {
          title: 'Kompakt',
          description:
            'Die kürzeste nützliche Fassung mit den wichtigsten Schlüssen und Einschränkungen.',
        },
        balanced: {
          title: 'Ausgewogen',
          description:
            'Eine vollständige Zusammenfassung für den Alltag mit Argumenten, Beispielen und Kontext. Der Standard.',
        },
        deep: {
          title: 'Tiefgehend',
          description:
            'Eine lernfertige Erklärung mit vollständiger Struktur, Beispielen, Ausnahmen und praktischen Schlüssen.',
        },
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
