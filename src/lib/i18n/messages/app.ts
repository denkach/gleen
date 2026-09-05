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
    destination: {
      ready: 'This workspace is ready for the next product stage.',
      newAnalysis: 'New analysis',
    },
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
        summaryPreset: 'Summary mode',
        flashcardCount: 'Flashcard count',
        summaryModes: {
          compact: {
            title: 'Compact',
            description:
              'The shortest useful version with the main conclusions and important caveats.',
          },
          balanced: {
            title: 'Balanced',
            description:
              'A complete everyday summary with arguments, examples, and context. The default.',
          },
          deep: {
            title: 'Deep',
            description:
              'A study-ready explanation with full structure, examples, exceptions, and practical conclusions.',
          },
        },
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
        unavailableTitle: 'Recent analyses are temporarily unavailable',
        unavailableDescription:
          'Your new analysis is still available. Open History to try again.',
        thumbnailUnavailable: 'No thumbnail',
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
        live_not_ready:
          'This live video is not ready to analyze yet. Try again after the stream ends.',
        unsupported_duration:
          'This video duration is not supported. Choose a shorter video and try again.',
        transcript_unavailable: 'A transcript is not available for this video.',
        transcript_language_unavailable:
          'The transcript language is not supported for analysis. Choose another video.',
        provider_outage:
          'The video service is temporarily unavailable. Try again.',
        no_artifacts: 'Choose at least one artifact.',
        session_expired: 'Your session has expired. Sign in and try again.',
        usage_limit_reached: 'Your analysis limit has been reached.',
        unexpected: 'We could not prepare this analysis. Try again.',
      },
    },
    processing: {
      fixture: {
        developmentOnly: 'Development-only deterministic demo',
        title: 'Analyze processing motion fixture',
        analysisLabel: 'Fixture analysis',
        startAnalysis: 'Start fixture analysis',
        analyze: 'Analyze video',
        replay: 'Replay sequence',
        previewError: 'Preview error',
        error: 'Fixture error: the demo video could not be accessed.',
        resume: 'Resume active analysis',
      },
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
      artifactStates: {
        summary: {
          queued: 'Summary is queued',
          ready: 'Summary is ready',
          failed: 'Summary failed',
          notSelected: 'Summary not selected',
        },
        flashcards: {
          queued: 'Flashcards are queued',
          ready: 'Flashcards are ready',
          failed: 'Flashcards failed',
          notSelected: 'Flashcards not selected',
        },
        timestamps: {
          queued: 'Timestamps are queued',
          ready: 'Timestamps are ready',
          failed: 'Timestamps failed',
          notSelected: 'Timestamps not selected',
        },
        export: {
          queued: 'Export is queued',
          ready: 'Export is ready',
          failed: 'Export failed',
          notSelected: 'Export not selected',
        },
      },
      leaveNote:
        'You can safely leave this page. We’ll save the result to your history.',
      tryAgain: 'Try again',
      retrying: 'Retrying…',
      viewAvailable: 'View available results',
      retryFailed: 'Retry failed artifact',
      analysisLabel: 'ANALYSIS',
      errors: {
        generationInterruptedTitle: 'Material generation was interrupted.',
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
      summaryPreset: 'Summary mode',
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
    destination: {
      ready: 'Цей робочий простір готовий до наступного етапу продукту.',
      newAnalysis: 'Новий аналіз',
    },
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
        summaryPreset: 'Режим конспекту',
        flashcardCount: 'Кількість карток',
        summaryModes: {
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
        unavailableTitle: 'Останні аналізи тимчасово недоступні',
        unavailableDescription:
          'Новий аналіз доступний. Відкрийте історію, щоб спробувати ще раз.',
        thumbnailUnavailable: 'Немає обкладинки',
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
        live_not_ready:
          'Ця пряма трансляція ще не готова до аналізу. Спробуйте після її завершення.',
        unsupported_duration:
          'Тривалість цього відео не підтримується. Виберіть коротше відео.',
        transcript_unavailable: 'Для цього відео немає доступного транскрипту.',
        transcript_language_unavailable:
          'Мова транскрипту не підтримується для аналізу. Виберіть інше відео.',
        provider_outage: 'Відеосервіс тимчасово недоступний. Спробуйте ще раз.',
        no_artifacts: 'Виберіть принаймні один матеріал.',
        session_expired: 'Ваш сеанс завершено. Увійдіть і спробуйте ще раз.',
        usage_limit_reached: 'Ліміт аналізів вичерпано.',
        unexpected: 'Не вдалося підготувати аналіз. Спробуйте ще раз.',
      },
    },
    processing: {
      fixture: {
        developmentOnly: 'Детермінована демонстрація лише для розробки',
        title: 'Тестовий екран руху обробки аналізу',
        analysisLabel: 'Тестовий аналіз',
        startAnalysis: 'Почати тестовий аналіз',
        analyze: 'Аналізувати відео',
        replay: 'Повторити послідовність',
        previewError: 'Переглянути помилку',
        error: 'Помилка тесту: не вдалося отримати доступ до демовідео.',
        resume: 'Продовжити активний аналіз',
      },
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
      artifactStates: {
        summary: {
          queued: 'Конспект у черзі',
          ready: 'Конспект готовий',
          failed: 'Не вдалося створити конспект',
          notSelected: 'Конспект не вибрано',
        },
        flashcards: {
          queued: 'Картки в черзі',
          ready: 'Картки готові',
          failed: 'Не вдалося створити картки',
          notSelected: 'Картки не вибрано',
        },
        timestamps: {
          queued: 'Таймкоди в черзі',
          ready: 'Таймкоди готові',
          failed: 'Не вдалося створити таймкоди',
          notSelected: 'Таймкоди не вибрано',
        },
        export: {
          queued: 'Експорт у черзі',
          ready: 'Експорт готовий',
          failed: 'Не вдалося експортувати',
          notSelected: 'Експорт не вибрано',
        },
      },
      leaveNote:
        'Можете безпечно залишити сторінку. Результат збережеться в історії.',
      tryAgain: 'Спробувати ще раз',
      retrying: 'Повторюємо…',
      viewAvailable: 'Переглянути доступні результати',
      retryFailed: 'Повторити невдалий матеріал',
      analysisLabel: 'АНАЛІЗ',
      errors: {
        generationInterruptedTitle: 'Створення матеріалів перервано.',
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
      summaryPreset: 'Режим конспекту',
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
    destination: {
      ready: 'Это рабочее пространство готово к следующему этапу продукта.',
      newAnalysis: 'Новый анализ',
    },
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
        summaryPreset: 'Режим конспекта',
        flashcardCount: 'Количество карточек',
        summaryModes: {
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
        unavailableTitle: 'Недавние анализы временно недоступны',
        unavailableDescription:
          'Новый анализ по-прежнему доступен. Откройте историю и попробуйте снова.',
        thumbnailUnavailable: 'Нет обложки',
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
        live_not_ready:
          'Эта прямая трансляция ещё не готова к анализу. Попробуйте после её завершения.',
        unsupported_duration:
          'Длительность этого видео не поддерживается. Выберите более короткое видео.',
        transcript_unavailable: 'Для этого видео нет доступного транскрипта.',
        transcript_language_unavailable:
          'Язык транскрипта не поддерживается для анализа. Выберите другое видео.',
        provider_outage: 'Видеосервис временно недоступен. Попробуйте ещё раз.',
        no_artifacts: 'Выберите хотя бы один материал.',
        session_expired: 'Сеанс завершён. Войдите и попробуйте ещё раз.',
        usage_limit_reached: 'Лимит анализов исчерпан.',
        unexpected: 'Не удалось подготовить анализ. Попробуйте ещё раз.',
      },
    },
    processing: {
      fixture: {
        developmentOnly: 'Детерминированная демонстрация только для разработки',
        title: 'Тестовый экран движения обработки анализа',
        analysisLabel: 'Тестовый анализ',
        startAnalysis: 'Начать тестовый анализ',
        analyze: 'Анализировать видео',
        replay: 'Повторить последовательность',
        previewError: 'Показать ошибку',
        error: 'Ошибка теста: не удалось получить доступ к демовидео.',
        resume: 'Продолжить активный анализ',
      },
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
      artifactStates: {
        summary: {
          queued: 'Конспект в очереди',
          ready: 'Конспект готов',
          failed: 'Не удалось создать конспект',
          notSelected: 'Конспект не выбран',
        },
        flashcards: {
          queued: 'Карточки в очереди',
          ready: 'Карточки готовы',
          failed: 'Не удалось создать карточки',
          notSelected: 'Карточки не выбраны',
        },
        timestamps: {
          queued: 'Таймкоды в очереди',
          ready: 'Таймкоды готовы',
          failed: 'Не удалось создать таймкоды',
          notSelected: 'Таймкоды не выбраны',
        },
        export: {
          queued: 'Экспорт в очереди',
          ready: 'Экспорт готов',
          failed: 'Не удалось экспортировать',
          notSelected: 'Экспорт не выбран',
        },
      },
      leaveNote:
        'Можно безопасно покинуть страницу. Результат сохранится в истории.',
      tryAgain: 'Попробовать ещё раз',
      retrying: 'Повторяем…',
      viewAvailable: 'Посмотреть доступные результаты',
      retryFailed: 'Повторить неудачный материал',
      analysisLabel: 'АНАЛИЗ',
      errors: {
        generationInterruptedTitle: 'Создание материалов прервано.',
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
      summaryPreset: 'Режим конспекта',
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
    destination: {
      ready:
        'Este espacio de trabajo está listo para la siguiente fase del producto.',
      newAnalysis: 'Nuevo análisis',
    },
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
        description: 'Elige los materiales de aprendizaje para este análisis.',
        outputLanguage: 'Idioma de salida',
        artifacts: 'Materiales',
        summaryPreset: 'Modo del resumen',
        flashcardCount: 'Número de tarjetas',
        summaryModes: {
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
        unavailableTitle:
          'Los análisis recientes no están disponibles temporalmente',
        unavailableDescription:
          'Puedes crear un nuevo análisis. Abre el historial para intentarlo de nuevo.',
        thumbnailUnavailable: 'Sin miniatura',
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
        live_not_ready:
          'Este vídeo en directo aún no está listo para analizarse. Inténtalo cuando termine la emisión.',
        unsupported_duration:
          'La duración de este vídeo no es compatible. Elige un vídeo más corto.',
        transcript_unavailable:
          'No hay una transcripción disponible para este vídeo.',
        transcript_language_unavailable:
          'El idioma de la transcripción no es compatible con el análisis. Elige otro vídeo.',
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
      fixture: {
        developmentOnly: 'Demostración determinista solo para desarrollo',
        title: 'Vista de prueba del procesamiento del análisis',
        analysisLabel: 'Análisis de prueba',
        startAnalysis: 'Iniciar análisis de prueba',
        analyze: 'Analizar vídeo',
        replay: 'Repetir secuencia',
        previewError: 'Previsualizar error',
        error:
          'Error de la prueba: no se pudo acceder al vídeo de demostración.',
        resume: 'Reanudar análisis activo',
      },
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
          subtitle: 'Creando tus materiales de aprendizaje.',
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
        artifacts: 'Creando materiales de aprendizaje',
      },
      artifactStates: {
        summary: {
          queued: 'El resumen está en cola',
          ready: 'El resumen está listo',
          failed: 'No se pudo crear el resumen',
          notSelected: 'El resumen no está seleccionado',
        },
        flashcards: {
          queued: 'Las tarjetas están en cola',
          ready: 'Las tarjetas están listas',
          failed: 'No se pudieron crear las tarjetas',
          notSelected: 'Las tarjetas no están seleccionadas',
        },
        timestamps: {
          queued: 'Las marcas de tiempo están en cola',
          ready: 'Las marcas de tiempo están listas',
          failed: 'No se pudieron crear las marcas de tiempo',
          notSelected: 'Las marcas de tiempo no están seleccionadas',
        },
        export: {
          queued: 'La exportación está en cola',
          ready: 'La exportación está lista',
          failed: 'No se pudo crear la exportación',
          notSelected: 'La exportación no está seleccionada',
        },
      },
      leaveNote:
        'Puedes salir de esta página con seguridad. Guardaremos el resultado en tu historial.',
      tryAgain: 'Intentar de nuevo',
      retrying: 'Reintentando…',
      viewAvailable: 'Ver resultados disponibles',
      retryFailed: 'Reintentar material fallido',
      analysisLabel: 'ANÁLISIS',
      errors: {
        generationInterruptedTitle: 'Se interrumpió la creación de materiales.',
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
      summaryPreset: 'Modo del resumen',
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
    destination: {
      ready: 'Dieser Arbeitsbereich ist für die nächste Produktphase bereit.',
      newAnalysis: 'Neue Analyse',
    },
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
        summaryPreset: 'Zusammenfassungsmodus',
        flashcardCount: 'Anzahl der Lernkarten',
        summaryModes: {
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
        noCredits: 'Es wird kein Guthaben verbraucht.',
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
        unavailableTitle: 'Letzte Analysen sind vorübergehend nicht verfügbar',
        unavailableDescription:
          'Eine neue Analyse ist weiterhin möglich. Öffne den Verlauf und versuche es erneut.',
        thumbnailUnavailable: 'Kein Vorschaubild',
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
        live_not_ready:
          'Dieses Livevideo ist noch nicht zur Analyse bereit. Versuche es nach Ende des Streams erneut.',
        unsupported_duration:
          'Die Dauer dieses Videos wird nicht unterstützt. Wähle ein kürzeres Video.',
        transcript_unavailable:
          'Für dieses Video ist kein Transkript verfügbar.',
        transcript_language_unavailable:
          'Die Sprache des Transkripts wird für die Analyse nicht unterstützt. Wähle ein anderes Video.',
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
      fixture: {
        developmentOnly: 'Deterministische Demo nur für die Entwicklung',
        title: 'Testansicht für die Analyseverarbeitung',
        analysisLabel: 'Testanalyse',
        startAnalysis: 'Testanalyse starten',
        analyze: 'Video analysieren',
        replay: 'Sequenz wiederholen',
        previewError: 'Fehler anzeigen',
        error: 'Testfehler: Auf das Demovideo konnte nicht zugegriffen werden.',
        resume: 'Aktive Analyse fortsetzen',
      },
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
      artifactStates: {
        summary: {
          queued: 'Die Zusammenfassung ist in der Warteschlange',
          ready: 'Die Zusammenfassung ist bereit',
          failed: 'Die Zusammenfassung ist fehlgeschlagen',
          notSelected: 'Die Zusammenfassung ist nicht ausgewählt',
        },
        flashcards: {
          queued: 'Die Lernkarten sind in der Warteschlange',
          ready: 'Die Lernkarten sind bereit',
          failed: 'Die Lernkarten sind fehlgeschlagen',
          notSelected: 'Die Lernkarten sind nicht ausgewählt',
        },
        timestamps: {
          queued: 'Die Zeitmarken sind in der Warteschlange',
          ready: 'Die Zeitmarken sind bereit',
          failed: 'Die Zeitmarken sind fehlgeschlagen',
          notSelected: 'Die Zeitmarken sind nicht ausgewählt',
        },
        export: {
          queued: 'Der Export ist in der Warteschlange',
          ready: 'Der Export ist bereit',
          failed: 'Der Export ist fehlgeschlagen',
          notSelected: 'Der Export ist nicht ausgewählt',
        },
      },
      leaveNote:
        'Du kannst diese Seite sicher verlassen. Wir speichern das Ergebnis in deinem Verlauf.',
      tryAgain: 'Erneut versuchen',
      retrying: 'Neuer Versuch…',
      viewAvailable: 'Verfügbare Ergebnisse anzeigen',
      retryFailed: 'Fehlgeschlagenes Material erneut versuchen',
      analysisLabel: 'ANALYSE',
      errors: {
        generationInterruptedTitle:
          'Die Erstellung der Materialien wurde unterbrochen.',
        retryStart:
          'Der neue Versuch konnte nicht gestartet werden. Bitte versuche es erneut.',
        refreshUnavailable:
          'Die Statusaktualisierung ist vorübergehend nicht verfügbar. Neuer Versuch…',
        stopped:
          'Die Analyse wurde sicher beendet. Fertige Ergebnisse wurden gespeichert.',
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
      summaryPreset: 'Zusammenfassungsmodus',
      flashcardPreset: 'Lernkartenvorgabe',
      cards: {
        one: '{count} Karte',
        few: '{count} Karten',
        many: '{count} Karten',
        other: '{count} Karten',
      },
      note: 'Video und Originaltranskript wurden validiert. Die Verarbeitung wird in der nächsten Aufgabe umgesetzt; es gibt noch keine erstellten Materialien.',
      back: '← Zurück zur neuen Analyse',
    },
  },
});

export type AppMessages = (typeof appMessages)['en'];
