import { defineMessages } from '../catalog';

export type SettingsErrorCode =
  | 'invalid_locale'
  | 'invalid_summary_mode'
  | 'invalid_display_name'
  | 'invalid_flashcard_preset'
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
    profile: {
      title: 'Profile',
      description: 'Manage the identity shown across your Gleen account.',
      nameForm: 'Display name',
      displayName: 'Display name',
      email: 'Email',
      verified: 'Verified',
      unverified: 'Not verified',
      save: 'Save name',
    },
    preferences: {
      title: 'Preferences',
      description:
        'Defaults for new analyses. You can still adjust each video.',
      flashcards: {
        title: 'Flashcard default',
        description:
          'Choose how many study cards new analyses create by default.',
        label: 'Default flashcard count',
        save: 'Save flashcard count',
      },
    },
    atlas: {
      navigationLabel: 'Settings sections',
      back: 'Back to Settings',
      overviewTitle: 'Account Atlas',
      overviewDescription:
        'A clear view of your profile, defaults, languages, connections, security, and data.',
      summaries: {
        verifiedEmail: 'Verified email',
        unverifiedEmail: 'Unverified email',
        profile: (name: string, emailState: string) =>
          `${name} · ${emailState}`,
        preferences: (mode: string, cards: number) =>
          `${mode} · ${cards} cards`,
        language: (interfaceName: string, outputName: string) =>
          `${interfaceName} · ${outputName} output`,
        integrations: 'Exports available from results',
        security: (method: string) => `${method} sign-in`,
        data: 'History and exports',
      },
      destinations: {
        profile: {
          title: 'Profile',
          description: 'Your name, avatar, and verified email.',
          unavailable: 'Profile details unavailable',
        },
        preferences: {
          title: 'Preferences',
          description: 'Defaults for summaries and study materials.',
          unavailable: 'Preferences unavailable',
        },
        language: {
          title: 'Language',
          description: 'Independent interface and output languages.',
          unavailable: 'Language settings unavailable',
        },
        integrations: {
          title: 'Integrations',
          description: 'Truthful export and connection capabilities.',
          unavailable: 'Integration status unavailable',
        },
        security: {
          title: 'Security',
          description: 'Sign-in methods and account protection.',
          unavailable: 'Security details unavailable',
        },
        data: {
          title: 'Data',
          description: 'Your history, exports, and account controls.',
          unavailable: 'Data details unavailable',
        },
      },
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
        invalid_display_name: 'Enter a name between 1 and 100 characters.',
        invalid_flashcard_preset: 'Choose an available flashcard count.',
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
    profile: {
      title: 'Профіль',
      description: 'Керуйте ім’ям, яке відображається у вашому акаунті Gleen.',
      nameForm: 'Відображуване ім’я',
      displayName: 'Відображуване ім’я',
      email: 'Електронна пошта',
      verified: 'Підтверджено',
      unverified: 'Не підтверджено',
      save: 'Зберегти ім’я',
    },
    preferences: {
      title: 'Уподобання',
      description:
        'Стандартні параметри нових аналізів. Для кожного відео їх можна змінити.',
      flashcards: {
        title: 'Картки за замовчуванням',
        description: 'Виберіть кількість навчальних карток для нових аналізів.',
        label: 'Кількість карток за замовчуванням',
        save: 'Зберегти кількість карток',
      },
    },
    atlas: {
      navigationLabel: 'Розділи налаштувань',
      back: 'Назад до налаштувань',
      overviewTitle: 'Атлас акаунта',
      overviewDescription:
        'Чіткий огляд профілю, стандартів, мов, підключень, безпеки й даних.',
      summaries: {
        verifiedEmail: 'Пошту підтверджено',
        unverifiedEmail: 'Пошту не підтверджено',
        profile: (name: string, emailState: string) =>
          `${name} · ${emailState}`,
        preferences: (mode: string, cards: number) =>
          `${mode} · ${cards} карток`,
        language: (interfaceName: string, outputName: string) =>
          `${interfaceName} · результати: ${outputName}`,
        integrations: 'Експорт доступний у результатах',
        security: (method: string) => `Вхід: ${method}`,
        data: 'Історія та експорт',
      },
      destinations: {
        profile: {
          title: 'Профіль',
          description: 'Ваше ім’я, аватар і підтверджена пошта.',
          unavailable: 'Дані профілю недоступні',
        },
        preferences: {
          title: 'Уподобання',
          description: 'Стандартні параметри конспектів і навчання.',
          unavailable: 'Уподобання недоступні',
        },
        language: {
          title: 'Мова',
          description: 'Окремі мови інтерфейсу та результатів.',
          unavailable: 'Мовні налаштування недоступні',
        },
        integrations: {
          title: 'Інтеграції',
          description: 'Реальні можливості експорту й підключень.',
          unavailable: 'Статус інтеграцій недоступний',
        },
        security: {
          title: 'Безпека',
          description: 'Способи входу та захист акаунта.',
          unavailable: 'Дані безпеки недоступні',
        },
        data: {
          title: 'Дані',
          description: 'Історія, експорт і керування акаунтом.',
          unavailable: 'Дані акаунта недоступні',
        },
      },
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
        invalid_display_name: 'Введіть ім’я довжиною від 1 до 100 символів.',
        invalid_flashcard_preset: 'Виберіть доступну кількість карток.',
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
    profile: {
      title: 'Профиль',
      description:
        'Управляйте именем, которое отображается в вашем аккаунте Gleen.',
      nameForm: 'Отображаемое имя',
      displayName: 'Отображаемое имя',
      email: 'Электронная почта',
      verified: 'Подтверждена',
      unverified: 'Не подтверждена',
      save: 'Сохранить имя',
    },
    preferences: {
      title: 'Предпочтения',
      description:
        'Параметры новых анализов по умолчанию. Для каждого видео их можно изменить.',
      flashcards: {
        title: 'Карточки по умолчанию',
        description: 'Выберите количество учебных карточек для новых анализов.',
        label: 'Количество карточек по умолчанию',
        save: 'Сохранить количество карточек',
      },
    },
    atlas: {
      navigationLabel: 'Разделы настроек',
      back: 'Назад к настройкам',
      overviewTitle: 'Атлас аккаунта',
      overviewDescription:
        'Понятный обзор профиля, параметров, языков, подключений, безопасности и данных.',
      summaries: {
        verifiedEmail: 'Почта подтверждена',
        unverifiedEmail: 'Почта не подтверждена',
        profile: (name: string, emailState: string) =>
          `${name} · ${emailState}`,
        preferences: (mode: string, cards: number) =>
          `${mode} · ${cards} карточек`,
        language: (interfaceName: string, outputName: string) =>
          `${interfaceName} · результаты: ${outputName}`,
        integrations: 'Экспорт доступен в результатах',
        security: (method: string) => `Вход: ${method}`,
        data: 'История и экспорт',
      },
      destinations: {
        profile: {
          title: 'Профиль',
          description: 'Ваше имя, аватар и подтверждённая почта.',
          unavailable: 'Данные профиля недоступны',
        },
        preferences: {
          title: 'Предпочтения',
          description: 'Настройки по умолчанию для конспектов и обучения.',
          unavailable: 'Предпочтения недоступны',
        },
        language: {
          title: 'Язык',
          description: 'Отдельные языки интерфейса и результатов.',
          unavailable: 'Языковые настройки недоступны',
        },
        integrations: {
          title: 'Интеграции',
          description: 'Реальные возможности экспорта и подключений.',
          unavailable: 'Статус интеграций недоступен',
        },
        security: {
          title: 'Безопасность',
          description: 'Способы входа и защита аккаунта.',
          unavailable: 'Данные безопасности недоступны',
        },
        data: {
          title: 'Данные',
          description: 'История, экспорт и управление аккаунтом.',
          unavailable: 'Данные аккаунта недоступны',
        },
      },
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
        invalid_display_name: 'Введите имя длиной от 1 до 100 символов.',
        invalid_flashcard_preset: 'Выберите доступное количество карточек.',
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
    profile: {
      title: 'Perfil',
      description: 'Gestiona el nombre que aparece en tu cuenta de Gleen.',
      nameForm: 'Nombre visible',
      displayName: 'Nombre visible',
      email: 'Correo electrónico',
      verified: 'Verificado',
      unverified: 'Sin verificar',
      save: 'Guardar nombre',
    },
    preferences: {
      title: 'Preferencias',
      description:
        'Valores predeterminados para nuevos análisis. Puedes ajustarlos en cada vídeo.',
      flashcards: {
        title: 'Tarjetas predeterminadas',
        description: 'Elige cuántas tarjetas crearán los nuevos análisis.',
        label: 'Número predeterminado de tarjetas',
        save: 'Guardar número de tarjetas',
      },
    },
    atlas: {
      navigationLabel: 'Secciones de ajustes',
      back: 'Volver a Ajustes',
      overviewTitle: 'Atlas de la cuenta',
      overviewDescription:
        'Una vista clara del perfil, valores predeterminados, idiomas, conexiones, seguridad y datos.',
      summaries: {
        verifiedEmail: 'Correo verificado',
        unverifiedEmail: 'Correo sin verificar',
        profile: (name: string, emailState: string) =>
          `${name} · ${emailState}`,
        preferences: (mode: string, cards: number) =>
          `${mode} · ${cards} tarjetas`,
        language: (interfaceName: string, outputName: string) =>
          `${interfaceName} · salida: ${outputName}`,
        integrations: 'Exportaciones disponibles en los resultados',
        security: (method: string) => `Acceso: ${method}`,
        data: 'Historial y exportaciones',
      },
      destinations: {
        profile: {
          title: 'Perfil',
          description: 'Tu nombre, avatar y correo verificado.',
          unavailable: 'Datos del perfil no disponibles',
        },
        preferences: {
          title: 'Preferencias',
          description: 'Valores predeterminados para resúmenes y estudio.',
          unavailable: 'Preferencias no disponibles',
        },
        language: {
          title: 'Idioma',
          description: 'Idiomas independientes para interfaz y resultados.',
          unavailable: 'Ajustes de idioma no disponibles',
        },
        integrations: {
          title: 'Integraciones',
          description: 'Capacidades reales de exportación y conexión.',
          unavailable: 'Estado de integraciones no disponible',
        },
        security: {
          title: 'Seguridad',
          description: 'Métodos de acceso y protección de la cuenta.',
          unavailable: 'Datos de seguridad no disponibles',
        },
        data: {
          title: 'Datos',
          description: 'Historial, exportaciones y controles de cuenta.',
          unavailable: 'Datos de la cuenta no disponibles',
        },
      },
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
        invalid_display_name:
          'Introduce un nombre de entre 1 y 100 caracteres.',
        invalid_flashcard_preset: 'Elige una cantidad de tarjetas disponible.',
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
    profile: {
      title: 'Profil',
      description:
        'Verwalte den Namen, der in deinem Gleen-Konto angezeigt wird.',
      nameForm: 'Anzeigename',
      displayName: 'Anzeigename',
      email: 'E-Mail',
      verified: 'Bestätigt',
      unverified: 'Nicht bestätigt',
      save: 'Namen speichern',
    },
    preferences: {
      title: 'Präferenzen',
      description:
        'Standards für neue Analysen. Du kannst jedes Video separat anpassen.',
      flashcards: {
        title: 'Standard-Lernkarten',
        description:
          'Wähle die Standardanzahl der Lernkarten für neue Analysen.',
        label: 'Standardanzahl der Lernkarten',
        save: 'Lernkartenanzahl speichern',
      },
    },
    atlas: {
      navigationLabel: 'Einstellungsbereiche',
      back: 'Zurück zu Einstellungen',
      overviewTitle: 'Kontoatlas',
      overviewDescription:
        'Ein klarer Überblick über Profil, Standards, Sprachen, Verbindungen, Sicherheit und Daten.',
      summaries: {
        verifiedEmail: 'E-Mail bestätigt',
        unverifiedEmail: 'E-Mail nicht bestätigt',
        profile: (name: string, emailState: string) =>
          `${name} · ${emailState}`,
        preferences: (mode: string, cards: number) =>
          `${mode} · ${cards} Karten`,
        language: (interfaceName: string, outputName: string) =>
          `${interfaceName} · Ausgabe: ${outputName}`,
        integrations: 'Exporte in Ergebnissen verfügbar',
        security: (method: string) => `Anmeldung: ${method}`,
        data: 'Verlauf und Exporte',
      },
      destinations: {
        profile: {
          title: 'Profil',
          description: 'Dein Name, Avatar und bestätigte E-Mail-Adresse.',
          unavailable: 'Profildaten nicht verfügbar',
        },
        preferences: {
          title: 'Präferenzen',
          description: 'Standards für Zusammenfassungen und Lernmaterial.',
          unavailable: 'Präferenzen nicht verfügbar',
        },
        language: {
          title: 'Sprache',
          description: 'Getrennte Sprachen für Oberfläche und Ergebnisse.',
          unavailable: 'Spracheinstellungen nicht verfügbar',
        },
        integrations: {
          title: 'Integrationen',
          description: 'Tatsächliche Export- und Verbindungsfunktionen.',
          unavailable: 'Integrationsstatus nicht verfügbar',
        },
        security: {
          title: 'Sicherheit',
          description: 'Anmeldemethoden und Kontoschutz.',
          unavailable: 'Sicherheitsdaten nicht verfügbar',
        },
        data: {
          title: 'Daten',
          description: 'Verlauf, Exporte und Kontosteuerung.',
          unavailable: 'Kontodaten nicht verfügbar',
        },
      },
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
        invalid_display_name: 'Gib einen Namen mit 1 bis 100 Zeichen ein.',
        invalid_flashcard_preset: 'Wähle eine verfügbare Lernkartenanzahl.',
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
