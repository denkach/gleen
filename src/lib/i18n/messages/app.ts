import { defineMessages } from '../catalog';

export const appMessages = defineMessages({
  en: {
    metadata: {
      newAnalysisTitle: 'New analysis — Gleen',
      newAnalysisDescription: 'Turn a YouTube video into reusable knowledge.',
    },
    shell: {
      brandHome: 'Gleen home',
      skipToContent: 'Skip to content',
      unavailableDescription: 'Unavailable in this version',
      workspace: 'Workspace',
      help: 'Help',
      applicationNavigation: 'Application navigation',
      helpNavigation: 'Help navigation',
      mobileNavigation: 'Mobile navigation',
      support: 'Support',
      notifications: 'Notifications',
      usageUnavailable: 'Usage available with billing',
      usageRemaining: {
        one: '{count} analysis left',
        few: '{count} analyses left',
        many: '{count} analyses left',
        other: '{count} analyses left',
      },
      navigation: {
        new: { label: 'New analysis', mobileLabel: 'New' },
        history: { label: 'History', mobileLabel: 'History' },
        subscription: { label: 'Subscription', mobileLabel: 'Plan' },
        settings: { label: 'Settings', mobileLabel: 'Profile' },
      },
    },
    loading: { workspace: 'Loading workspace' },
    newAnalysis: {
      eyebrow: 'New analysis',
      title: 'Turn a video into something useful.',
      urlLabel: 'YouTube URL',
      urlPlaceholder: 'Paste a YouTube link',
      submit: 'Analyze video',
      submitting: 'Analyzing…',
      advanced: {
        trigger: 'Advanced options',
        title: 'Advanced options',
        description: 'Choose the knowledge artifacts for this analysis.',
        outputLanguage: 'Output language',
        artifacts: 'Artifacts',
        summaryPreset: 'Summary preset',
        flashcardCount: 'Flashcard count',
        balanced: 'Balanced',
        detailed: 'Detailed',
        done: 'Done',
        noArtifacts: 'No artifacts selected',
        chooseArtifact: 'Choose at least one artifact.',
      },
      artifacts: {
        summary: 'Summary',
        timestamps: 'Timestamps',
        transcript: 'Transcript',
        flashcards: 'Flashcards',
      },
      duplicate: {
        title: 'You already analyzed this video.',
        noCredits: 'No credits will be used.',
        openSaved: 'Open saved result',
        analyzeAgain: 'Analyze again',
        dialogTitle: 'Analyze this video again?',
        dialogDescription: 'A new processing attempt will be created.',
        confirm: 'Confirm analysis',
        creating: 'Creating…',
        cancel: 'Cancel',
      },
      recent: {
        title: 'Recent analyses',
        viewHistory: 'View history →',
        emptyTitle: 'No analyses yet',
        emptyDescription: 'Your completed analyses will appear here.',
      },
      monthly: {
        title: 'This month',
        managePlan: 'Manage plan',
        empty:
          'Usage and study metrics become available after your first analysis.',
      },
      errors: {
        invalid_url:
          'Enter a supported YouTube URL and valid analysis options.',
        video_unavailable: 'This video is private, restricted, or unavailable.',
        transcript_unavailable: 'A transcript is not available for this video.',
        provider_outage:
          'The video service is temporarily unavailable. Try again.',
        no_artifacts: 'Choose at least one artifact.',
        session_expired: 'Your session has expired. Sign in and try again.',
        usage_limit_reached: 'Your analysis limit has been reached.',
        unexpected: 'We could not prepare this analysis. Try again.',
      },
    },
    processing: {
      kickerProgress: 'ANALYSIS IN PROGRESS',
      kickerInterrupted: 'ANALYSIS INTERRUPTED',
      artifactStatus: 'Artifact status',
      presentations: {
        idle: {
          title: 'Analyze your video',
          subtitle: 'Paste a YouTube URL to begin.',
        },
        submitting: {
          title: 'Analyzing your video',
          subtitle: 'Checking video and transcript…',
        },
        validating: {
          title: 'Analyzing your video',
          subtitle: 'Validating the source.',
        },
        transcript: {
          title: 'Analyzing your video',
          subtitle: 'Finding the transcript.',
        },
        structuring: {
          title: 'Finding the signal',
          subtitle: 'Structuring key ideas.',
        },
        artifacts: {
          title: 'Separating the spectrum',
          subtitle: 'Creating your knowledge artifacts.',
        },
        complete: {
          title: 'Your artifacts are ready',
          subtitle: 'Opening the result workspace',
        },
        error: {
          title: 'We couldn’t access this video.',
          subtitle: 'Check that it is public and try again.',
        },
      },
      stages: {
        validating: 'Validating video',
        transcript: 'Finding transcript',
        structuring: 'Structuring key ideas',
        artifacts: 'Creating knowledge artifacts',
      },
      rails: {
        summary: 'SUMMARY',
        flashcards: 'FLASHCARDS',
        timestamps: 'TIMESTAMPS',
        export: 'EXPORT',
      },
      railStates: {
        queued: 'queued',
        ready: 'ready',
        failed: 'failed',
        notSelected: 'not selected',
      },
      leaveNote:
        'You can safely leave this page. We’ll save the result to your history.',
      tryAgain: 'Try again',
      retrying: 'Retrying…',
      viewAvailable: 'View available results',
      retryFailed: 'Retry failed artifact',
      analysisLabel: 'ANALYSIS',
      errors: {
        retryStart: 'Retry could not be started. Please try again.',
        refreshUnavailable:
          'Status refresh is temporarily unavailable. Retrying…',
        stopped: 'Analysis stopped safely. Your completed work has been kept.',
        partial: 'Some artifacts are ready. Retry only the unfinished work.',
        restart: 'We couldn’t restart the unfinished work. Please try again.',
      },
      partialStatus:
        'Some artifacts need attention. Your ready results remain usable.',
      artifactReady: 'ready',
      artifactNeedsRetry: 'needs retry',
    },
    readiness: {
      eyebrow: 'Validated intake',
      statuses: {
        ready: 'Ready for processing',
        processing: 'Processing',
        complete: 'Complete',
        failed: 'Processing failed',
      },
      duration: 'Duration',
      transcriptLanguage: 'Transcript language',
      outputLanguage: 'Output language',
      selectedArtifacts: 'Selected artifacts',
      summaryPreset: 'Summary preset',
      flashcardPreset: 'Flashcard preset',
      cards: {
        one: '{count} card',
        few: '{count} cards',
        many: '{count} cards',
        other: '{count} cards',
      },
      note: 'Your video and native transcript are validated. Processing is implemented in the next issue; no generated artifacts exist yet.',
      back: '← Back to New analysis',
    },
  },
  uk: {
    metadata: {
      newAnalysisTitle: 'Новий аналіз — Gleen',
      newAnalysisDescription: 'Перетворіть відео YouTube на корисні матеріали.',
    },
    shell: {
      brandHome: 'Головна Gleen',
      skipToContent: 'Перейти до вмісту',
      unavailableDescription: 'Недоступно в цій версії',
      workspace: 'Робочий простір',
      help: 'Допомога',
      applicationNavigation: 'Навігація застосунку',
      helpNavigation: 'Навігація допомоги',
      mobileNavigation: 'Мобільна навігація',
      support: 'Підтримка',
      notifications: 'Сповіщення',
      usageUnavailable: 'Використання доступне разом з оплатою',
      usageRemaining: {
        one: 'Залишився {count} аналіз',
        few: 'Залишилося {count} аналізи',
        many: 'Залишилося {count} аналізів',
        other: 'Залишилося {count} аналізу',
      },
      navigation: {
        new: { label: 'Новий аналіз', mobileLabel: 'Новий' },
        history: { label: 'Історія', mobileLabel: 'Історія' },
        subscription: { label: 'Підписка', mobileLabel: 'Тариф' },
        settings: { label: 'Налаштування', mobileLabel: 'Профіль' },
      },
    },
    loading: { workspace: 'Завантаження робочого простору' },
    newAnalysis: {
      eyebrow: 'Новий аналіз',
      title: 'Перетворіть відео на щось корисне.',
      urlLabel: 'URL-адреса YouTube',
      urlPlaceholder: 'Вставте посилання на YouTube',
      submit: 'Аналізувати відео',
      submitting: 'Аналізуємо…',
      advanced: {
        trigger: 'Розширені налаштування',
        title: 'Розширені налаштування',
        description: 'Виберіть навчальні матеріали для цього аналізу.',
        outputLanguage: 'Мова результатів',
        artifacts: 'Матеріали',
        summaryPreset: 'Стиль конспекту',
        flashcardCount: 'Кількість карток',
        balanced: 'Збалансований',
        detailed: 'Докладний',
        done: 'Готово',
        noArtifacts: 'Матеріали не вибрано',
        chooseArtifact: 'Виберіть принаймні один матеріал.',
      },
      artifacts: {
        summary: 'Конспект',
        timestamps: 'Таймкоди',
        transcript: 'Транскрипт',
        flashcards: 'Картки',
      },
      duplicate: {
        title: 'Ви вже аналізували це відео.',
        noCredits: 'Кредити не буде використано.',
        openSaved: 'Відкрити збережений результат',
        analyzeAgain: 'Аналізувати ще раз',
        dialogTitle: 'Проаналізувати це відео ще раз?',
        dialogDescription: 'Буде створено нову спробу обробки.',
        confirm: 'Підтвердити аналіз',
        creating: 'Створюємо…',
        cancel: 'Скасувати',
      },
      recent: {
        title: 'Останні аналізи',
        viewHistory: 'Переглянути історію →',
        emptyTitle: 'Аналізів ще немає',
        emptyDescription: 'Завершені аналізи з’являться тут.',
      },
      monthly: {
        title: 'Цього місяця',
        managePlan: 'Керувати тарифом',
        empty:
          'Дані про використання й навчання з’являться після першого аналізу.',
      },
      errors: {
        invalid_url:
          'Введіть підтримувану URL-адресу YouTube і правильні параметри аналізу.',
        video_unavailable: 'Це відео приватне, обмежене або недоступне.',
        transcript_unavailable: 'Для цього відео немає доступного транскрипту.',
        provider_outage: 'Відеосервіс тимчасово недоступний. Спробуйте ще раз.',
        no_artifacts: 'Виберіть принаймні один матеріал.',
        session_expired: 'Ваш сеанс завершено. Увійдіть і спробуйте ще раз.',
        usage_limit_reached: 'Ліміт аналізів вичерпано.',
        unexpected: 'Не вдалося підготувати аналіз. Спробуйте ще раз.',
      },
    },
    processing: {
      kickerProgress: 'АНАЛІЗ ТРИВАЄ',
      kickerInterrupted: 'АНАЛІЗ ПЕРЕРВАНО',
      artifactStatus: 'Стан матеріалів',
      presentations: {
        idle: {
          title: 'Проаналізуйте відео',
          subtitle: 'Вставте URL-адресу YouTube, щоб почати.',
        },
        submitting: {
          title: 'Аналізуємо відео',
          subtitle: 'Перевіряємо відео й транскрипт…',
        },
        validating: {
          title: 'Аналізуємо відео',
          subtitle: 'Перевіряємо джерело.',
        },
        transcript: {
          title: 'Аналізуємо відео',
          subtitle: 'Шукаємо транскрипт.',
        },
        structuring: {
          title: 'Знаходимо головне',
          subtitle: 'Структуруємо ключові ідеї.',
        },
        artifacts: {
          title: 'Розкладаємо спектр',
          subtitle: 'Створюємо навчальні матеріали.',
        },
        complete: {
          title: 'Ваші матеріали готові',
          subtitle: 'Відкриваємо робочий простір результату',
        },
        error: {
          title: 'Не вдалося отримати доступ до відео.',
          subtitle: 'Перевірте, чи воно публічне, і спробуйте ще раз.',
        },
      },
      stages: {
        validating: 'Перевірка відео',
        transcript: 'Пошук транскрипту',
        structuring: 'Структурування ключових ідей',
        artifacts: 'Створення навчальних матеріалів',
      },
      rails: {
        summary: 'КОНСПЕКТ',
        flashcards: 'КАРТКИ',
        timestamps: 'ТАЙМКОДИ',
        export: 'ЕКСПОРТ',
      },
      railStates: {
        queued: 'у черзі',
        ready: 'готово',
        failed: 'помилка',
        notSelected: 'не вибрано',
      },
      leaveNote:
        'Можете безпечно залишити сторінку. Результат збережеться в історії.',
      tryAgain: 'Спробувати ще раз',
      retrying: 'Повторюємо…',
      viewAvailable: 'Переглянути доступні результати',
      retryFailed: 'Повторити невдалий матеріал',
      analysisLabel: 'АНАЛІЗ',
      errors: {
        retryStart: 'Не вдалося розпочати повторну спробу. Спробуйте ще раз.',
        refreshUnavailable: 'Оновлення стану тимчасово недоступне. Повторюємо…',
        stopped: 'Аналіз безпечно зупинено. Готові матеріали збережено.',
        partial: 'Деякі матеріали готові. Повторіть лише незавершену роботу.',
        restart:
          'Не вдалося перезапустити незавершену роботу. Спробуйте ще раз.',
      },
      partialStatus:
        'Деякі матеріали потребують уваги. Готові результати можна використовувати.',
      artifactReady: 'готово',
      artifactNeedsRetry: 'потрібно повторити',
    },
    readiness: {
      eyebrow: 'Перевірені вхідні дані',
      statuses: {
        ready: 'Готово до обробки',
        processing: 'Обробка',
        complete: 'Завершено',
        failed: 'Помилка обробки',
      },
      duration: 'Тривалість',
      transcriptLanguage: 'Мова транскрипту',
      outputLanguage: 'Мова результатів',
      selectedArtifacts: 'Вибрані матеріали',
      summaryPreset: 'Стиль конспекту',
      flashcardPreset: 'Набір карток',
      cards: {
        one: '{count} картка',
        few: '{count} картки',
        many: '{count} карток',
        other: '{count} картки',
      },
      note: 'Відео й оригінальний транскрипт перевірено. Обробку буде реалізовано в наступному завданні; створених матеріалів ще немає.',
      back: '← Назад до нового аналізу',
    },
  },
  ru: {
    metadata: {
      newAnalysisTitle: 'Новый анализ — Gleen',
      newAnalysisDescription: 'Превратите видео YouTube в полезные материалы.',
    },
    shell: {
      brandHome: 'Главная Gleen',
      skipToContent: 'Перейти к содержимому',
      unavailableDescription: 'Недоступно в этой версии',
      workspace: 'Рабочее пространство',
      help: 'Помощь',
      applicationNavigation: 'Навигация приложения',
      helpNavigation: 'Навигация помощи',
      mobileNavigation: 'Мобильная навигация',
      support: 'Поддержка',
      notifications: 'Уведомления',
      usageUnavailable: 'Использование доступно вместе с оплатой',
      usageRemaining: {
        one: 'Остался {count} анализ',
        few: 'Осталось {count} анализа',
        many: 'Осталось {count} анализов',
        other: 'Осталось {count} анализа',
      },
      navigation: {
        new: { label: 'Новый анализ', mobileLabel: 'Новый' },
        history: { label: 'История', mobileLabel: 'История' },
        subscription: { label: 'Подписка', mobileLabel: 'Тариф' },
        settings: { label: 'Настройки', mobileLabel: 'Профиль' },
      },
    },
    loading: { workspace: 'Загрузка рабочего пространства' },
    newAnalysis: {
      eyebrow: 'Новый анализ',
      title: 'Превратите видео во что-то полезное.',
      urlLabel: 'URL-адрес YouTube',
      urlPlaceholder: 'Вставьте ссылку на YouTube',
      submit: 'Анализировать видео',
      submitting: 'Анализируем…',
      advanced: {
        trigger: 'Расширенные настройки',
        title: 'Расширенные настройки',
        description: 'Выберите учебные материалы для этого анализа.',
        outputLanguage: 'Язык результатов',
        artifacts: 'Материалы',
        summaryPreset: 'Стиль конспекта',
        flashcardCount: 'Количество карточек',
        balanced: 'Сбалансированный',
        detailed: 'Подробный',
        done: 'Готово',
        noArtifacts: 'Материалы не выбраны',
        chooseArtifact: 'Выберите хотя бы один материал.',
      },
      artifacts: {
        summary: 'Конспект',
        timestamps: 'Таймкоды',
        transcript: 'Транскрипт',
        flashcards: 'Карточки',
      },
      duplicate: {
        title: 'Вы уже анализировали это видео.',
        noCredits: 'Кредиты не будут использованы.',
        openSaved: 'Открыть сохранённый результат',
        analyzeAgain: 'Анализировать снова',
        dialogTitle: 'Проанализировать это видео снова?',
        dialogDescription: 'Будет создана новая попытка обработки.',
        confirm: 'Подтвердить анализ',
        creating: 'Создаём…',
        cancel: 'Отмена',
      },
      recent: {
        title: 'Недавние анализы',
        viewHistory: 'Посмотреть историю →',
        emptyTitle: 'Анализов пока нет',
        emptyDescription: 'Завершённые анализы появятся здесь.',
      },
      monthly: {
        title: 'В этом месяце',
        managePlan: 'Управлять тарифом',
        empty:
          'Данные об использовании и обучении появятся после первого анализа.',
      },
      errors: {
        invalid_url:
          'Введите поддерживаемый URL-адрес YouTube и правильные параметры анализа.',
        video_unavailable: 'Это видео закрыто, ограничено или недоступно.',
        transcript_unavailable: 'Для этого видео нет доступного транскрипта.',
        provider_outage: 'Видеосервис временно недоступен. Попробуйте ещё раз.',
        no_artifacts: 'Выберите хотя бы один материал.',
        session_expired: 'Сеанс завершён. Войдите и попробуйте ещё раз.',
        usage_limit_reached: 'Лимит анализов исчерпан.',
        unexpected: 'Не удалось подготовить анализ. Попробуйте ещё раз.',
      },
    },
    processing: {
      kickerProgress: 'АНАЛИЗ ВЫПОЛНЯЕТСЯ',
      kickerInterrupted: 'АНАЛИЗ ПРЕРВАН',
      artifactStatus: 'Состояние материалов',
      presentations: {
        idle: {
          title: 'Проанализируйте видео',
          subtitle: 'Вставьте URL-адрес YouTube, чтобы начать.',
        },
        submitting: {
          title: 'Анализируем видео',
          subtitle: 'Проверяем видео и транскрипт…',
        },
        validating: {
          title: 'Анализируем видео',
          subtitle: 'Проверяем источник.',
        },
        transcript: {
          title: 'Анализируем видео',
          subtitle: 'Ищем транскрипт.',
        },
        structuring: {
          title: 'Находим главное',
          subtitle: 'Структурируем ключевые идеи.',
        },
        artifacts: {
          title: 'Разделяем спектр',
          subtitle: 'Создаём учебные материалы.',
        },
        complete: {
          title: 'Ваши материалы готовы',
          subtitle: 'Открываем рабочее пространство результата',
        },
        error: {
          title: 'Не удалось получить доступ к видео.',
          subtitle: 'Проверьте, что оно открыто, и попробуйте ещё раз.',
        },
      },
      stages: {
        validating: 'Проверка видео',
        transcript: 'Поиск транскрипта',
        structuring: 'Структурирование ключевых идей',
        artifacts: 'Создание учебных материалов',
      },
      rails: {
        summary: 'КОНСПЕКТ',
        flashcards: 'КАРТОЧКИ',
        timestamps: 'ТАЙМКОДЫ',
        export: 'ЭКСПОРТ',
      },
      railStates: {
        queued: 'в очереди',
        ready: 'готово',
        failed: 'ошибка',
        notSelected: 'не выбрано',
      },
      leaveNote:
        'Можно безопасно покинуть страницу. Результат сохранится в истории.',
      tryAgain: 'Попробовать ещё раз',
      retrying: 'Повторяем…',
      viewAvailable: 'Посмотреть доступные результаты',
      retryFailed: 'Повторить неудачный материал',
      analysisLabel: 'АНАЛИЗ',
      errors: {
        retryStart: 'Не удалось начать повторную попытку. Попробуйте ещё раз.',
        refreshUnavailable:
          'Обновление состояния временно недоступно. Повторяем…',
        stopped: 'Анализ безопасно остановлен. Готовые материалы сохранены.',
        partial:
          'Некоторые материалы готовы. Повторите только незавершённую работу.',
        restart:
          'Не удалось перезапустить незавершённую работу. Попробуйте ещё раз.',
      },
      partialStatus:
        'Некоторые материалы требуют внимания. Готовые результаты можно использовать.',
      artifactReady: 'готово',
      artifactNeedsRetry: 'нужно повторить',
    },
    readiness: {
      eyebrow: 'Проверенные входные данные',
      statuses: {
        ready: 'Готово к обработке',
        processing: 'Обработка',
        complete: 'Завершено',
        failed: 'Ошибка обработки',
      },
      duration: 'Длительность',
      transcriptLanguage: 'Язык транскрипта',
      outputLanguage: 'Язык результатов',
      selectedArtifacts: 'Выбранные материалы',
      summaryPreset: 'Стиль конспекта',
      flashcardPreset: 'Набор карточек',
      cards: {
        one: '{count} карточка',
        few: '{count} карточки',
        many: '{count} карточек',
        other: '{count} карточки',
      },
      note: 'Видео и оригинальный транскрипт проверены. Обработка будет реализована в следующей задаче; созданных материалов пока нет.',
      back: '← Назад к новому анализу',
    },
  },
  es: {
    metadata: {
      newAnalysisTitle: 'Nuevo análisis — Gleen',
      newAnalysisDescription:
        'Convierte un vídeo de YouTube en conocimiento reutilizable.',
    },
    shell: {
      brandHome: 'Inicio de Gleen',
      skipToContent: 'Saltar al contenido',
      unavailableDescription: 'No disponible en esta versión',
      workspace: 'Espacio de trabajo',
      help: 'Ayuda',
      applicationNavigation: 'Navegación de la aplicación',
      helpNavigation: 'Navegación de ayuda',
      mobileNavigation: 'Navegación móvil',
      support: 'Soporte',
      notifications: 'Notificaciones',
      usageUnavailable: 'Uso disponible con la facturación',
      usageRemaining: {
        one: 'Queda {count} análisis',
        few: 'Quedan {count} análisis',
        many: 'Quedan {count} análisis',
        other: 'Quedan {count} análisis',
      },
      navigation: {
        new: { label: 'Nuevo análisis', mobileLabel: 'Nuevo' },
        history: { label: 'Historial', mobileLabel: 'Historial' },
        subscription: { label: 'Suscripción', mobileLabel: 'Plan' },
        settings: { label: 'Ajustes', mobileLabel: 'Perfil' },
      },
    },
    loading: { workspace: 'Cargando el espacio de trabajo' },
    newAnalysis: {
      eyebrow: 'Nuevo análisis',
      title: 'Convierte un vídeo en algo útil.',
      urlLabel: 'URL de YouTube',
      urlPlaceholder: 'Pega un enlace de YouTube',
      submit: 'Analizar vídeo',
      submitting: 'Analizando…',
      advanced: {
        trigger: 'Opciones avanzadas',
        title: 'Opciones avanzadas',
        description: 'Elige los materiales de conocimiento para este análisis.',
        outputLanguage: 'Idioma de salida',
        artifacts: 'Materiales',
        summaryPreset: 'Estilo del resumen',
        flashcardCount: 'Número de tarjetas',
        balanced: 'Equilibrado',
        detailed: 'Detallado',
        done: 'Listo',
        noArtifacts: 'No hay materiales seleccionados',
        chooseArtifact: 'Elige al menos un material.',
      },
      artifacts: {
        summary: 'Resumen',
        timestamps: 'Marcas de tiempo',
        transcript: 'Transcripción',
        flashcards: 'Tarjetas',
      },
      duplicate: {
        title: 'Ya has analizado este vídeo.',
        noCredits: 'No se usarán créditos.',
        openSaved: 'Abrir resultado guardado',
        analyzeAgain: 'Analizar de nuevo',
        dialogTitle: '¿Analizar este vídeo de nuevo?',
        dialogDescription: 'Se creará un nuevo intento de procesamiento.',
        confirm: 'Confirmar análisis',
        creating: 'Creando…',
        cancel: 'Cancelar',
      },
      recent: {
        title: 'Análisis recientes',
        viewHistory: 'Ver historial →',
        emptyTitle: 'Todavía no hay análisis',
        emptyDescription: 'Tus análisis completados aparecerán aquí.',
      },
      monthly: {
        title: 'Este mes',
        managePlan: 'Gestionar plan',
        empty:
          'Las métricas de uso y estudio estarán disponibles después de tu primer análisis.',
      },
      errors: {
        invalid_url:
          'Introduce una URL de YouTube compatible y opciones de análisis válidas.',
        video_unavailable:
          'Este vídeo es privado, está restringido o no está disponible.',
        transcript_unavailable:
          'No hay una transcripción disponible para este vídeo.',
        provider_outage:
          'El servicio de vídeo no está disponible temporalmente. Inténtalo de nuevo.',
        no_artifacts: 'Elige al menos un material.',
        session_expired:
          'Tu sesión ha caducado. Inicia sesión e inténtalo de nuevo.',
        usage_limit_reached: 'Has alcanzado el límite de análisis.',
        unexpected:
          'No hemos podido preparar este análisis. Inténtalo de nuevo.',
      },
    },
    processing: {
      kickerProgress: 'ANÁLISIS EN CURSO',
      kickerInterrupted: 'ANÁLISIS INTERRUMPIDO',
      artifactStatus: 'Estado de los materiales',
      presentations: {
        idle: {
          title: 'Analiza tu vídeo',
          subtitle: 'Pega una URL de YouTube para empezar.',
        },
        submitting: {
          title: 'Analizando tu vídeo',
          subtitle: 'Comprobando el vídeo y la transcripción…',
        },
        validating: {
          title: 'Analizando tu vídeo',
          subtitle: 'Validando la fuente.',
        },
        transcript: {
          title: 'Analizando tu vídeo',
          subtitle: 'Buscando la transcripción.',
        },
        structuring: {
          title: 'Encontrando la señal',
          subtitle: 'Estructurando las ideas clave.',
        },
        artifacts: {
          title: 'Separando el espectro',
          subtitle: 'Creando tus materiales de conocimiento.',
        },
        complete: {
          title: 'Tus materiales están listos',
          subtitle: 'Abriendo el espacio de resultados',
        },
        error: {
          title: 'No hemos podido acceder a este vídeo.',
          subtitle: 'Comprueba que sea público e inténtalo de nuevo.',
        },
      },
      stages: {
        validating: 'Validando el vídeo',
        transcript: 'Buscando la transcripción',
        structuring: 'Estructurando las ideas clave',
        artifacts: 'Creando materiales de conocimiento',
      },
      rails: {
        summary: 'RESUMEN',
        flashcards: 'TARJETAS',
        timestamps: 'MARCAS',
        export: 'EXPORTAR',
      },
      railStates: {
        queued: 'en cola',
        ready: 'listo',
        failed: 'error',
        notSelected: 'no seleccionado',
      },
      leaveNote:
        'Puedes salir de esta página con seguridad. Guardaremos el resultado en tu historial.',
      tryAgain: 'Intentar de nuevo',
      retrying: 'Reintentando…',
      viewAvailable: 'Ver resultados disponibles',
      retryFailed: 'Reintentar material fallido',
      analysisLabel: 'ANÁLISIS',
      errors: {
        retryStart: 'No se pudo iniciar el reintento. Inténtalo de nuevo.',
        refreshUnavailable:
          'La actualización del estado no está disponible temporalmente. Reintentando…',
        stopped:
          'El análisis se detuvo de forma segura. Se ha conservado el trabajo completado.',
        partial:
          'Algunos materiales están listos. Reintenta solo el trabajo pendiente.',
        restart:
          'No se pudo reiniciar el trabajo pendiente. Inténtalo de nuevo.',
      },
      partialStatus:
        'Algunos materiales necesitan atención. Tus resultados listos siguen disponibles.',
      artifactReady: 'listo',
      artifactNeedsRetry: 'necesita reintento',
    },
    readiness: {
      eyebrow: 'Entrada validada',
      statuses: {
        ready: 'Listo para procesar',
        processing: 'Procesando',
        complete: 'Completado',
        failed: 'Error de procesamiento',
      },
      duration: 'Duración',
      transcriptLanguage: 'Idioma de la transcripción',
      outputLanguage: 'Idioma de salida',
      selectedArtifacts: 'Materiales seleccionados',
      summaryPreset: 'Estilo del resumen',
      flashcardPreset: 'Ajuste de tarjetas',
      cards: {
        one: '{count} tarjeta',
        few: '{count} tarjetas',
        many: '{count} tarjetas',
        other: '{count} tarjetas',
      },
      note: 'El vídeo y su transcripción original están validados. El procesamiento se implementa en la siguiente tarea; todavía no existen materiales generados.',
      back: '← Volver a Nuevo análisis',
    },
  },
  de: {
    metadata: {
      newAnalysisTitle: 'Neue Analyse — Gleen',
      newAnalysisDescription:
        'Verwandle ein YouTube-Video in wiederverwendbares Wissen.',
    },
    shell: {
      brandHome: 'Gleen-Startseite',
      skipToContent: 'Zum Inhalt springen',
      unavailableDescription: 'In dieser Version nicht verfügbar',
      workspace: 'Arbeitsbereich',
      help: 'Hilfe',
      applicationNavigation: 'Anwendungsnavigation',
      helpNavigation: 'Hilfenavigation',
      mobileNavigation: 'Mobile Navigation',
      support: 'Support',
      notifications: 'Benachrichtigungen',
      usageUnavailable: 'Nutzung mit Abrechnung verfügbar',
      usageRemaining: {
        one: '{count} Analyse übrig',
        few: '{count} Analysen übrig',
        many: '{count} Analysen übrig',
        other: '{count} Analysen übrig',
      },
      navigation: {
        new: { label: 'Neue Analyse', mobileLabel: 'Neu' },
        history: { label: 'Verlauf', mobileLabel: 'Verlauf' },
        subscription: { label: 'Abonnement', mobileLabel: 'Tarif' },
        settings: { label: 'Einstellungen', mobileLabel: 'Profil' },
      },
    },
    loading: { workspace: 'Arbeitsbereich wird geladen' },
    newAnalysis: {
      eyebrow: 'Neue Analyse',
      title: 'Mach aus einem Video etwas Nützliches.',
      urlLabel: 'YouTube-URL',
      urlPlaceholder: 'YouTube-Link einfügen',
      submit: 'Video analysieren',
      submitting: 'Analyse läuft…',
      advanced: {
        trigger: 'Erweiterte Optionen',
        title: 'Erweiterte Optionen',
        description: 'Wähle die Wissensmaterialien für diese Analyse.',
        outputLanguage: 'Ausgabesprache',
        artifacts: 'Materialien',
        summaryPreset: 'Zusammenfassungsstil',
        flashcardCount: 'Anzahl der Lernkarten',
        balanced: 'Ausgewogen',
        detailed: 'Detailliert',
        done: 'Fertig',
        noArtifacts: 'Keine Materialien ausgewählt',
        chooseArtifact: 'Wähle mindestens ein Material aus.',
      },
      artifacts: {
        summary: 'Zusammenfassung',
        timestamps: 'Zeitmarken',
        transcript: 'Transkript',
        flashcards: 'Lernkarten',
      },
      duplicate: {
        title: 'Du hast dieses Video bereits analysiert.',
        noCredits: 'Es werden keine Guthaben verbraucht.',
        openSaved: 'Gespeichertes Ergebnis öffnen',
        analyzeAgain: 'Erneut analysieren',
        dialogTitle: 'Dieses Video erneut analysieren?',
        dialogDescription: 'Ein neuer Verarbeitungsversuch wird erstellt.',
        confirm: 'Analyse bestätigen',
        creating: 'Wird erstellt…',
        cancel: 'Abbrechen',
      },
      recent: {
        title: 'Letzte Analysen',
        viewHistory: 'Verlauf anzeigen →',
        emptyTitle: 'Noch keine Analysen',
        emptyDescription:
          'Deine abgeschlossenen Analysen werden hier angezeigt.',
      },
      monthly: {
        title: 'Dieser Monat',
        managePlan: 'Tarif verwalten',
        empty:
          'Nutzungs- und Lernmetriken sind nach deiner ersten Analyse verfügbar.',
      },
      errors: {
        invalid_url:
          'Gib eine unterstützte YouTube-URL und gültige Analyseoptionen ein.',
        video_unavailable:
          'Dieses Video ist privat, eingeschränkt oder nicht verfügbar.',
        transcript_unavailable:
          'Für dieses Video ist kein Transkript verfügbar.',
        provider_outage:
          'Der Videodienst ist vorübergehend nicht verfügbar. Bitte versuche es erneut.',
        no_artifacts: 'Wähle mindestens ein Material aus.',
        session_expired:
          'Deine Sitzung ist abgelaufen. Melde dich an und versuche es erneut.',
        usage_limit_reached: 'Dein Analyselimit wurde erreicht.',
        unexpected:
          'Diese Analyse konnte nicht vorbereitet werden. Bitte versuche es erneut.',
      },
    },
    processing: {
      kickerProgress: 'ANALYSE LÄUFT',
      kickerInterrupted: 'ANALYSE UNTERBROCHEN',
      artifactStatus: 'Materialstatus',
      presentations: {
        idle: {
          title: 'Analysiere dein Video',
          subtitle: 'Füge zum Start eine YouTube-URL ein.',
        },
        submitting: {
          title: 'Dein Video wird analysiert',
          subtitle: 'Video und Transkript werden geprüft…',
        },
        validating: {
          title: 'Dein Video wird analysiert',
          subtitle: 'Die Quelle wird validiert.',
        },
        transcript: {
          title: 'Dein Video wird analysiert',
          subtitle: 'Das Transkript wird gesucht.',
        },
        structuring: {
          title: 'Das Wesentliche finden',
          subtitle: 'Kernideen werden strukturiert.',
        },
        artifacts: {
          title: 'Das Spektrum trennen',
          subtitle: 'Deine Wissensmaterialien werden erstellt.',
        },
        complete: {
          title: 'Deine Materialien sind bereit',
          subtitle: 'Der Ergebnisbereich wird geöffnet',
        },
        error: {
          title: 'Auf dieses Video konnte nicht zugegriffen werden.',
          subtitle: 'Prüfe, ob es öffentlich ist, und versuche es erneut.',
        },
      },
      stages: {
        validating: 'Video validieren',
        transcript: 'Transkript suchen',
        structuring: 'Kernideen strukturieren',
        artifacts: 'Wissensmaterialien erstellen',
      },
      rails: {
        summary: 'ZUSAMMENFASSUNG',
        flashcards: 'LERNKARTEN',
        timestamps: 'ZEITMARKEN',
        export: 'EXPORT',
      },
      railStates: {
        queued: 'in Warteschlange',
        ready: 'bereit',
        failed: 'fehlgeschlagen',
        notSelected: 'nicht ausgewählt',
      },
      leaveNote:
        'Du kannst diese Seite sicher verlassen. Wir speichern das Ergebnis in deinem Verlauf.',
      tryAgain: 'Erneut versuchen',
      retrying: 'Neuer Versuch…',
      viewAvailable: 'Verfügbare Ergebnisse anzeigen',
      retryFailed: 'Fehlgeschlagenes Material erneut versuchen',
      analysisLabel: 'ANALYSE',
      errors: {
        retryStart:
          'Der neue Versuch konnte nicht gestartet werden. Bitte versuche es erneut.',
        refreshUnavailable:
          'Die Statusaktualisierung ist vorübergehend nicht verfügbar. Neuer Versuch…',
        stopped:
          'Die Analyse wurde sicher beendet. Fertige Arbeit wurde beibehalten.',
        partial:
          'Einige Materialien sind bereit. Versuche nur die unfertige Arbeit erneut.',
        restart:
          'Die unfertige Arbeit konnte nicht neu gestartet werden. Bitte versuche es erneut.',
      },
      partialStatus:
        'Einige Materialien benötigen Aufmerksamkeit. Deine fertigen Ergebnisse bleiben nutzbar.',
      artifactReady: 'bereit',
      artifactNeedsRetry: 'erneuter Versuch nötig',
    },
    readiness: {
      eyebrow: 'Validierte Eingabe',
      statuses: {
        ready: 'Bereit zur Verarbeitung',
        processing: 'Wird verarbeitet',
        complete: 'Abgeschlossen',
        failed: 'Verarbeitung fehlgeschlagen',
      },
      duration: 'Dauer',
      transcriptLanguage: 'Transkriptsprache',
      outputLanguage: 'Ausgabesprache',
      selectedArtifacts: 'Ausgewählte Materialien',
      summaryPreset: 'Zusammenfassungsstil',
      flashcardPreset: 'Lernkartenvorgabe',
      cards: {
        one: '{count} Karte',
        few: '{count} Karten',
        many: '{count} Karten',
        other: '{count} Karten',
      },
      note: 'Video und Originaltranskript wurden validiert. Die Verarbeitung wird in der nächsten Aufgabe umgesetzt; es gibt noch keine erstellten Materialien.',
      back: '← Zurück zu Neue Analyse',
    },
  },
});

export type AppMessages = (typeof appMessages)['en'];
