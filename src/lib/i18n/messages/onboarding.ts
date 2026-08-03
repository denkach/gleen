import { defineMessages } from '../catalog';

export type OnboardingErrorCode =
  'invalid_step' | 'session_expired' | 'invalid_selection' | 'save_failed';

const onboardingErrorCodes = new Set<string>([
  'invalid_step',
  'session_expired',
  'invalid_selection',
  'save_failed',
]);

export const onboardingMessages = defineMessages({
  en: {
    metadata: {
      title: 'Personalize Gleen — Gleen',
      description: 'Choose your interface and generated-content preferences.',
    },
    shell: {
      visualTitle: 'Tune the spectrum.',
      visualDescription:
        'Set the language and output defaults that make Gleen yours.',
    },
    eyebrow: 'Personalize Gleen',
    progress: {
      step1: 'Step 1 of 3',
      step2: 'Step 2 of 3',
      step3: 'Step 3 of 3',
    },
    steps: {
      interface: {
        title: 'Interface language',
        description: 'Choose the language used throughout the Gleen interface.',
        choicesLabel: 'Interface language',
      },
      output: {
        title: 'Output language',
        description:
          'Choose the default language for generated content independently.',
        choicesLabel: 'Generated-content language',
      },
      preferences: {
        title: 'Output preferences',
        description:
          'Choose defaults for every new analysis. You can change them per video.',
      },
    },
    presets: {
      summaryBalanced: {
        title: 'Balanced summary',
        description: 'Clear structure with useful detail',
      },
      summaryDetailed: {
        title: 'Detailed summary',
        description: 'More context and deeper chapter notes',
      },
      flashcards18: {
        title: '18 flashcards',
        description: 'A focused study deck',
      },
      flashcards30: {
        title: '30 flashcards',
        description: 'A more comprehensive deck',
      },
    },
    actions: {
      back: 'Back',
      skip: 'Skip for now',
      saving: 'Saving…',
      finish: 'Finish setup',
      continue: 'Continue',
    },
    errors: {
      invalid_step: 'Choose a valid onboarding step.',
      session_expired: 'Your session has expired. Sign in again.',
      invalid_selection: 'Choose one of the available options.',
      save_failed: 'We could not save your preferences. Try again.',
    },
  },
  uk: {
    metadata: {
      title: 'Налаштуйте Gleen — Gleen',
      description:
        'Виберіть мову інтерфейсу й налаштування створеного контенту.',
    },
    shell: {
      visualTitle: 'Налаштуйте спектр.',
      visualDescription:
        'Виберіть мову й стандартні результати, щоб Gleen працював для вас.',
    },
    eyebrow: 'Налаштуйте Gleen',
    progress: {
      step1: 'Крок 1 із 3',
      step2: 'Крок 2 із 3',
      step3: 'Крок 3 із 3',
    },
    steps: {
      interface: {
        title: 'Мова інтерфейсу',
        description:
          'Виберіть мову, яка використовуватиметься в інтерфейсі Gleen.',
        choicesLabel: 'Мова інтерфейсу',
      },
      output: {
        title: 'Мова результатів',
        description: 'Окремо виберіть стандартну мову для створеного контенту.',
        choicesLabel: 'Мова створеного контенту',
      },
      preferences: {
        title: 'Налаштування результатів',
        description:
          'Виберіть стандартні параметри нового аналізу. Їх можна змінювати для кожного відео.',
      },
    },
    presets: {
      summaryBalanced: {
        title: 'Збалансований конспект',
        description: 'Чітка структура з корисними деталями',
      },
      summaryDetailed: {
        title: 'Докладний конспект',
        description: 'Більше контексту й докладніші нотатки до розділів',
      },
      flashcards18: {
        title: '18 карток',
        description: 'Сфокусований набір для навчання',
      },
      flashcards30: {
        title: '30 карток',
        description: 'Повніший набір для навчання',
      },
    },
    actions: {
      back: 'Назад',
      skip: 'Пропустити',
      saving: 'Зберігаємо…',
      finish: 'Завершити налаштування',
      continue: 'Продовжити',
    },
    errors: {
      invalid_step: 'Виберіть правильний крок налаштування.',
      session_expired: 'Ваш сеанс завершено. Увійдіть знову.',
      invalid_selection: 'Виберіть один із доступних варіантів.',
      save_failed: 'Не вдалося зберегти налаштування. Спробуйте ще раз.',
    },
  },
  ru: {
    metadata: {
      title: 'Настройте Gleen — Gleen',
      description:
        'Выберите язык интерфейса и параметры создаваемого контента.',
    },
    shell: {
      visualTitle: 'Настройте спектр.',
      visualDescription:
        'Выберите язык и стандартные результаты, чтобы Gleen работал для вас.',
    },
    eyebrow: 'Настройте Gleen',
    progress: {
      step1: 'Шаг 1 из 3',
      step2: 'Шаг 2 из 3',
      step3: 'Шаг 3 из 3',
    },
    steps: {
      interface: {
        title: 'Язык интерфейса',
        description: 'Выберите язык интерфейса Gleen.',
        choicesLabel: 'Язык интерфейса',
      },
      output: {
        title: 'Язык результатов',
        description:
          'Отдельно выберите стандартный язык создаваемого контента.',
        choicesLabel: 'Язык создаваемого контента',
      },
      preferences: {
        title: 'Настройки результатов',
        description:
          'Выберите стандартные параметры нового анализа. Их можно менять для каждого видео.',
      },
    },
    presets: {
      summaryBalanced: {
        title: 'Сбалансированный конспект',
        description: 'Чёткая структура с полезными подробностями',
      },
      summaryDetailed: {
        title: 'Подробный конспект',
        description: 'Больше контекста и подробные заметки к главам',
      },
      flashcards18: {
        title: '18 карточек',
        description: 'Сфокусированный набор для обучения',
      },
      flashcards30: {
        title: '30 карточек',
        description: 'Более полный набор для обучения',
      },
    },
    actions: {
      back: 'Назад',
      skip: 'Пропустить',
      saving: 'Сохраняем…',
      finish: 'Завершить настройку',
      continue: 'Продолжить',
    },
    errors: {
      invalid_step: 'Выберите правильный шаг настройки.',
      session_expired: 'Ваш сеанс завершён. Войдите снова.',
      invalid_selection: 'Выберите один из доступных вариантов.',
      save_failed: 'Не удалось сохранить настройки. Попробуйте ещё раз.',
    },
  },
  es: {
    metadata: {
      title: 'Personaliza Gleen — Gleen',
      description: 'Elige el idioma de la interfaz y del contenido generado.',
    },
    shell: {
      visualTitle: 'Ajusta el espectro.',
      visualDescription:
        'Define el idioma y los resultados predeterminados que hacen Gleen tuyo.',
    },
    eyebrow: 'Personaliza Gleen',
    progress: {
      step1: 'Paso 1 de 3',
      step2: 'Paso 2 de 3',
      step3: 'Paso 3 de 3',
    },
    steps: {
      interface: {
        title: 'Idioma de la interfaz',
        description: 'Elige el idioma que usa la interfaz de Gleen.',
        choicesLabel: 'Idioma de la interfaz',
      },
      output: {
        title: 'Idioma de los resultados',
        description:
          'Elige por separado el idioma predeterminado del contenido generado.',
        choicesLabel: 'Idioma del contenido generado',
      },
      preferences: {
        title: 'Preferencias de resultados',
        description:
          'Elige los valores predeterminados de cada análisis. Puedes cambiarlos por vídeo.',
      },
    },
    presets: {
      summaryBalanced: {
        title: 'Resumen equilibrado',
        description: 'Estructura clara con detalles útiles',
      },
      summaryDetailed: {
        title: 'Resumen detallado',
        description: 'Más contexto y notas de capítulos más profundas',
      },
      flashcards18: {
        title: '18 tarjetas',
        description: 'Una baraja de estudio enfocada',
      },
      flashcards30: {
        title: '30 tarjetas',
        description: 'Una baraja de estudio más completa',
      },
    },
    actions: {
      back: 'Atrás',
      skip: 'Omitir por ahora',
      saving: 'Guardando…',
      finish: 'Finalizar configuración',
      continue: 'Continuar',
    },
    errors: {
      invalid_step: 'Elige un paso de configuración válido.',
      session_expired: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
      invalid_selection: 'Elige una de las opciones disponibles.',
      save_failed:
        'No hemos podido guardar tus preferencias. Inténtalo de nuevo.',
    },
  },
  de: {
    metadata: {
      title: 'Gleen personalisieren — Gleen',
      description:
        'Wähle die Sprache der Benutzeroberfläche und der generierten Inhalte.',
    },
    shell: {
      visualTitle: 'Stimme das Spektrum ab.',
      visualDescription:
        'Lege Sprache und Ausgabestandards fest, die Gleen zu deinem Werkzeug machen.',
    },
    eyebrow: 'Gleen personalisieren',
    progress: {
      step1: 'Schritt 1 von 3',
      step2: 'Schritt 2 von 3',
      step3: 'Schritt 3 von 3',
    },
    steps: {
      interface: {
        title: 'Sprache der Benutzeroberfläche',
        description: 'Wähle die Sprache der Gleen-Benutzeroberfläche.',
        choicesLabel: 'Sprache der Benutzeroberfläche',
      },
      output: {
        title: 'Sprache der Ergebnisse',
        description:
          'Wähle unabhängig davon die Standardsprache für generierte Inhalte.',
        choicesLabel: 'Sprache der generierten Inhalte',
      },
      preferences: {
        title: 'Ausgabeeinstellungen',
        description:
          'Wähle Standards für jede neue Analyse. Du kannst sie pro Video ändern.',
      },
    },
    presets: {
      summaryBalanced: {
        title: 'Ausgewogene Zusammenfassung',
        description: 'Klare Struktur mit hilfreichen Details',
      },
      summaryDetailed: {
        title: 'Detaillierte Zusammenfassung',
        description: 'Mehr Kontext und ausführlichere Kapitelnotizen',
      },
      flashcards18: {
        title: '18 Lernkarten',
        description: 'Ein fokussierter Lernkartenstapel',
      },
      flashcards30: {
        title: '30 Lernkarten',
        description: 'Ein umfassenderer Lernkartenstapel',
      },
    },
    actions: {
      back: 'Zurück',
      skip: 'Vorerst überspringen',
      saving: 'Wird gespeichert…',
      finish: 'Einrichtung abschließen',
      continue: 'Weiter',
    },
    errors: {
      invalid_step: 'Wähle einen gültigen Einrichtungsschritt.',
      session_expired: 'Deine Sitzung ist abgelaufen. Melde dich erneut an.',
      invalid_selection: 'Wähle eine der verfügbaren Optionen.',
      save_failed:
        'Deine Einstellungen konnten nicht gespeichert werden. Bitte versuche es erneut.',
    },
  },
});

export type OnboardingCopy = (typeof onboardingMessages)['en'];

export function onboardingErrorMessage(
  copy: OnboardingCopy,
  code: string | undefined,
): string {
  const safeCode = onboardingErrorCodes.has(code ?? '')
    ? (code as OnboardingErrorCode)
    : 'save_failed';
  return copy.errors[safeCode];
}
