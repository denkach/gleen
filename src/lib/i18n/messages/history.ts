import { defineMessages } from '../catalog';
import { selectPlural } from '../format';
import type { Locale } from '../locales';

export const historyMessages = defineMessages({
  en: {
    metadata: {
      title: 'History — Gleen',
      description: 'Find and reopen your saved analyses.',
    },
    presentation: {
      statuses: {
        ready: 'Ready',
        partial: 'Partial',
        processing: 'Processing',
        failed: 'Failed',
      },
      presets: { compact: 'Compact', balanced: 'Balanced', deep: 'Deep' },
      dateUnavailable: 'Date unavailable',
    },
    page: {
      label: 'History',
      eyebrow: 'Your library',
      title: 'History',
      description: 'Open a saved result without spending another analysis.',
      newAnalysis: 'New analysis',
      noResults: 'No saved analyses',
      resultCount: {
        one: '{count} saved analysis',
        few: '{count} saved analyses',
        many: '{count} saved analyses',
        other: '{count} saved analyses',
      },
    },
    toolbar: {
      searchLabel: 'Search history',
      searchPlaceholder: 'Search by title, channel, URL, or keyword',
      sortTrigger: (sort: string) => `Sort history: ${sort}`,
      sortPrefix: 'Sort',
      sortMenuLabel: 'Sort history',
      sorts: {
        newest: 'Newest',
        oldest: 'Oldest',
        recent: 'Recently opened',
        'title-asc': 'A–Z',
        'title-desc': 'Z–A',
      },
      historyView: 'History view',
      views: {
        list: 'List',
        listLabel: 'List view',
        grid: 'Grid',
        gridUnavailable: 'Grid view unavailable',
      },
    },
    filters: {
      desktopTrigger: 'Filters',
      mobileTrigger: 'Filter',
      triggerLabel: (mobile: boolean, count: number) => {
        const noun = mobile ? 'Filter' : 'Filters';
        return count === 0
          ? `${noun}, none applied`
          : `${noun}, ${count} applied`;
      },
      panelTitle: 'Filter results',
      dialogTitle: 'Filters',
      dialogDescription: 'Refine the saved analyses shown in history.',
      close: 'Close filters',
      reset: 'Reset',
      clearAll: 'Clear all',
      apply: (count: number) => `Apply filters (${count})`,
      appliedNote: (count: number) =>
        count === 1 ? '1 filter applied' : `${count} filters applied`,
      status: 'Status',
      statuses: {
        ready: 'Ready',
        processing: 'Processing',
        failed: 'Failed',
      },
      language: 'Language',
      all: 'All',
      source: 'Source',
      allSources: 'All sources',
      dateRange: 'Date range',
      dates: {
        all: 'All time',
        today: 'Today',
        '7d': 'Last 7 days',
        '30d': 'Last 30 days',
        year: 'This year',
      },
      favoritesOnly: 'Favorites only',
      showFavoritesOnly: 'Show favorites only',
    },
    empty: {
      search: {
        title: (query: string) => `No results for “${query}”`,
        description: 'Try a different title, channel, URL, or keyword.',
        clear: 'Clear search',
      },
      filters: {
        title: 'No analyses match these filters',
        description: 'Clear the active filters to see more saved analyses.',
        clear: 'Clear filters',
      },
      initial: {
        title: 'No analyses yet',
        description:
          'Your completed and in-progress analyses will appear here.',
        start: 'Start a new analysis',
      },
      error: {
        announcement: 'History is temporarily unavailable.',
        title: 'History is unavailable',
        description: 'We could not load your saved analyses.',
        retry: 'Try again',
      },
    },
    list: {
      thumbnail: (title: string) => `Thumbnail for ${title}`,
      thumbnailUnavailable: (title: string) =>
        `Thumbnail unavailable for ${title}`,
      play: (title: string) => `Play ${title}`,
      columns: {
        video: 'Video',
        details: 'Details',
        status: 'Status',
        actions: 'Actions',
      },
    },
    actions: {
      menuLabel: (title: string) => `Actions for ${title}`,
      closeDialog: 'Close dialog',
      open: 'Open',
      continue: 'Continue',
      rename: {
        action: 'Rename',
        title: 'Rename saved analysis',
        description: 'Give this saved analysis a title that is easier to find.',
        field: 'Title',
        empty: 'Enter a title before saving.',
        cancel: 'Cancel',
        saving: 'Saving…',
        save: 'Save title',
      },
      delete: {
        action: 'Delete',
        title: 'Delete saved analysis?',
        description: (title: string) =>
          `Delete ${title} from your history. This cannot be undone.`,
        cancel: 'Cancel',
        deleting: 'Deleting…',
        confirm: 'Delete analysis',
      },
      favorite: {
        addLabel: (title: string) => `Add ${title} to favorites`,
        removeLabel: (title: string) => `Remove ${title} from favorites`,
      },
      duplicate: {
        label: 'Saved analysis available',
        title: 'You already analyzed this video',
        reassurance: (details: string) =>
          `Open the saved${details ? ` ${details}` : ''} version. No credits will be used.`,
        openSaved: 'Open saved result',
        analyzeAnother: 'Analyze another version',
        starting: 'Starting another analysis…',
        failed: 'We could not start another analysis. Try again.',
      },
      export: 'Export',
      exportUnavailable: 'Export unavailable',
    },
    loadMore: {
      loading: 'Loading…',
      action: 'Load more',
      retry: 'Try loading more again',
      rejected: 'We could not load more saved analyses. Try again.',
      more: (count: number) =>
        count === 1
          ? '1 more saved analysis loaded.'
          : `${count} more saved analyses loaded.`,
    },
    toasts: {
      favoriteAdded: (title: string) => `${title} added to favorites.`,
      favoriteRemoved: (title: string) => `${title} removed from favorites.`,
      renamed: (title: string) => `${title} renamed.`,
      deleted: (title: string) => `${title} deleted.`,
    },
    errors: {
      unauthorized: 'Your session has expired. Sign in and try again.',
      'not-found': 'This saved analysis is no longer available.',
      invalid: 'Check the requested change and try again.',
      conflict: 'This title changed elsewhere. Refresh and try again.',
      failed: 'We could not update History. Try again.',
    },
  },
  uk: {
    metadata: {
      title: 'Історія — Gleen',
      description: 'Знаходьте й відкривайте збережені аналізи.',
    },
    presentation: {
      statuses: {
        ready: 'Готово',
        partial: 'Частково',
        processing: 'Обробляється',
        failed: 'Помилка',
      },
      presets: {
        compact: 'Компактний',
        balanced: 'Збалансований',
        deep: 'Глибокий',
      },
      dateUnavailable: 'Дата недоступна',
    },
    page: {
      label: 'Історія',
      eyebrow: 'Ваша бібліотека',
      title: 'Історія',
      description:
        'Відкрийте збережений результат без витрати ще одного аналізу.',
      newAnalysis: 'Новий аналіз',
      noResults: 'Немає збережених аналізів',
      resultCount: {
        one: '{count} збережений аналіз',
        few: '{count} збережені аналізи',
        many: '{count} збережених аналізів',
        other: '{count} збереженого аналізу',
      },
    },
    toolbar: {
      searchLabel: 'Пошук в історії',
      searchPlaceholder: 'Пошук за назвою, каналом, URL або ключовим словом',
      sortTrigger: (sort: string) => `Сортувати історію: ${sort}`,
      sortPrefix: 'Сортування',
      sortMenuLabel: 'Сортувати історію',
      sorts: {
        newest: 'Найновіші',
        oldest: 'Найстаріші',
        recent: 'Нещодавно відкриті',
        'title-asc': 'А–Я',
        'title-desc': 'Я–А',
      },
      historyView: 'Вигляд історії',
      views: {
        list: 'Список',
        listLabel: 'Перегляд списком',
        grid: 'Сітка',
        gridUnavailable: 'Вигляд сітки недоступний',
      },
    },
    filters: {
      desktopTrigger: 'Фільтри',
      mobileTrigger: 'Фільтр',
      triggerLabel: (mobile: boolean, count: number) => {
        const noun = mobile ? 'Фільтр' : 'Фільтри';
        return count === 0
          ? `${noun}, не застосовано`
          : `${noun}, застосовано: ${count}`;
      },
      panelTitle: 'Фільтрувати результати',
      dialogTitle: 'Фільтри',
      dialogDescription:
        'Уточніть, які збережені аналізи показувати в історії.',
      close: 'Закрити фільтри',
      reset: 'Скинути',
      clearAll: 'Очистити все',
      apply: (count: number) => `Застосувати фільтри (${count})`,
      appliedNote: (count: number) => `Застосовано фільтрів: ${count}`,
      status: 'Статус',
      statuses: {
        ready: 'Готово',
        processing: 'Обробляється',
        failed: 'Помилка',
      },
      language: 'Мова',
      all: 'Усі',
      source: 'Джерело',
      allSources: 'Усі джерела',
      dateRange: 'Період',
      dates: {
        all: 'За весь час',
        today: 'Сьогодні',
        '7d': 'Останні 7 днів',
        '30d': 'Останні 30 днів',
        year: 'Цього року',
      },
      favoritesOnly: 'Лише обране',
      showFavoritesOnly: 'Показувати лише обране',
    },
    empty: {
      search: {
        title: (query: string) => `Немає результатів для «${query}»`,
        description: 'Спробуйте іншу назву, канал, URL або ключове слово.',
        clear: 'Очистити пошук',
      },
      filters: {
        title: 'Жоден аналіз не відповідає цим фільтрам',
        description: 'Очистьте активні фільтри, щоб побачити більше аналізів.',
        clear: 'Очистити фільтри',
      },
      initial: {
        title: 'Аналізів ще немає',
        description: 'Завершені та поточні аналізи з’являться тут.',
        start: 'Почати новий аналіз',
      },
      error: {
        announcement: 'Історія тимчасово недоступна.',
        title: 'Історія недоступна',
        description: 'Не вдалося завантажити збережені аналізи.',
        retry: 'Спробувати ще раз',
      },
    },
    list: {
      thumbnail: (title: string) => `Мініатюра для ${title}`,
      thumbnailUnavailable: (title: string) =>
        `Мініатюра недоступна для ${title}`,
      play: (title: string) => `Відкрити ${title}`,
      columns: {
        video: 'Відео',
        details: 'Деталі',
        status: 'Статус',
        actions: 'Дії',
      },
    },
    actions: {
      menuLabel: (title: string) => `Дії для ${title}`,
      closeDialog: 'Закрити діалог',
      open: 'Відкрити',
      continue: 'Продовжити',
      rename: {
        action: 'Перейменувати',
        title: 'Перейменувати збережений аналіз',
        description: 'Дайте аналізу назву, яку буде легше знайти.',
        field: 'Назва',
        empty: 'Введіть назву перед збереженням.',
        cancel: 'Скасувати',
        saving: 'Збереження…',
        save: 'Зберегти назву',
      },
      delete: {
        action: 'Видалити',
        title: 'Видалити збережений аналіз?',
        description: (title: string) =>
          `Видалити ${title} з історії? Цю дію не можна скасувати.`,
        cancel: 'Скасувати',
        deleting: 'Видалення…',
        confirm: 'Видалити аналіз',
      },
      favorite: {
        addLabel: (title: string) => `Додати ${title} до обраного`,
        removeLabel: (title: string) => `Видалити ${title} з обраного`,
      },
      duplicate: {
        label: 'Доступний збережений аналіз',
        title: 'Ви вже аналізували це відео',
        reassurance: (details: string) =>
          `Відкрийте збережену версію${details ? `: ${details}` : ''}. Відкриття збереженого результату не зараховується до вашого ліміту як новий аналіз.`,
        openSaved: 'Відкрити збережений результат',
        analyzeAnother: 'Проаналізувати іншу версію',
        starting: 'Запуск іншого аналізу…',
        failed: 'Не вдалося запустити інший аналіз. Спробуйте ще раз.',
      },
      export: 'Експорт',
      exportUnavailable: 'Експорт недоступний',
    },
    loadMore: {
      loading: 'Завантаження…',
      action: 'Завантажити ще',
      retry: 'Спробувати завантажити ще раз',
      rejected: 'Не вдалося завантажити більше аналізів. Спробуйте ще раз.',
      more: (count: number) => `Завантажено ще аналізів: ${count}.`,
    },
    toasts: {
      favoriteAdded: (title: string) => `${title} додано до обраного.`,
      favoriteRemoved: (title: string) => `${title} видалено з обраного.`,
      renamed: (title: string) => `${title} перейменовано.`,
      deleted: (title: string) => `${title} видалено.`,
    },
    errors: {
      unauthorized: 'Сеанс завершився. Увійдіть і спробуйте ще раз.',
      'not-found': 'Цей збережений аналіз більше недоступний.',
      invalid: 'Перевірте запитану зміну та спробуйте ще раз.',
      conflict:
        'Назву змінено в іншому місці. Оновіть сторінку та спробуйте ще раз.',
      failed: 'Не вдалося оновити історію. Спробуйте ще раз.',
    },
  },
  ru: {
    metadata: {
      title: 'История — Gleen',
      description: 'Находите и открывайте сохранённые анализы.',
    },
    presentation: {
      statuses: {
        ready: 'Готово',
        partial: 'Частично',
        processing: 'Обрабатывается',
        failed: 'Ошибка',
      },
      presets: {
        compact: 'Компактный',
        balanced: 'Сбалансированный',
        deep: 'Глубокий',
      },
      dateUnavailable: 'Дата недоступна',
    },
    page: {
      label: 'История',
      eyebrow: 'Ваша библиотека',
      title: 'История',
      description:
        'Откройте сохранённый результат без расхода ещё одного анализа.',
      newAnalysis: 'Новый анализ',
      noResults: 'Нет сохранённых анализов',
      resultCount: {
        one: '{count} сохранённый анализ',
        few: '{count} сохранённых анализа',
        many: '{count} сохранённых анализов',
        other: '{count} сохранённого анализа',
      },
    },
    toolbar: {
      searchLabel: 'Поиск в истории',
      searchPlaceholder: 'Поиск по названию, каналу, URL или ключевому слову',
      sortTrigger: (sort: string) => `Сортировать историю: ${sort}`,
      sortPrefix: 'Сортировка',
      sortMenuLabel: 'Сортировать историю',
      sorts: {
        newest: 'Сначала новые',
        oldest: 'Сначала старые',
        recent: 'Недавно открытые',
        'title-asc': 'А–Я',
        'title-desc': 'Я–А',
      },
      historyView: 'Вид истории',
      views: {
        list: 'Список',
        listLabel: 'Вид списком',
        grid: 'Сетка',
        gridUnavailable: 'Вид сеткой недоступен',
      },
    },
    filters: {
      desktopTrigger: 'Фильтры',
      mobileTrigger: 'Фильтр',
      triggerLabel: (mobile: boolean, count: number) => {
        const noun = mobile ? 'Фильтр' : 'Фильтры';
        return count === 0
          ? `${noun}, не применены`
          : `${noun}, применено: ${count}`;
      },
      panelTitle: 'Фильтровать результаты',
      dialogTitle: 'Фильтры',
      dialogDescription:
        'Уточните, какие сохранённые анализы показывать в истории.',
      close: 'Закрыть фильтры',
      reset: 'Сбросить',
      clearAll: 'Очистить всё',
      apply: (count: number) => `Применить фильтры (${count})`,
      appliedNote: (count: number) => `Применено фильтров: ${count}`,
      status: 'Статус',
      statuses: {
        ready: 'Готово',
        processing: 'Обрабатывается',
        failed: 'Ошибка',
      },
      language: 'Язык',
      all: 'Все',
      source: 'Источник',
      allSources: 'Все источники',
      dateRange: 'Период',
      dates: {
        all: 'За всё время',
        today: 'Сегодня',
        '7d': 'Последние 7 дней',
        '30d': 'Последние 30 дней',
        year: 'В этом году',
      },
      favoritesOnly: 'Только избранное',
      showFavoritesOnly: 'Показывать только избранное',
    },
    empty: {
      search: {
        title: (query: string) => `Нет результатов для «${query}»`,
        description:
          'Попробуйте другое название, канал, URL или ключевое слово.',
        clear: 'Очистить поиск',
      },
      filters: {
        title: 'Нет анализов с такими фильтрами',
        description:
          'Очистите активные фильтры, чтобы увидеть больше анализов.',
        clear: 'Очистить фильтры',
      },
      initial: {
        title: 'Анализов пока нет',
        description: 'Завершённые и текущие анализы появятся здесь.',
        start: 'Начать новый анализ',
      },
      error: {
        announcement: 'История временно недоступна.',
        title: 'История недоступна',
        description: 'Не удалось загрузить сохранённые анализы.',
        retry: 'Попробовать снова',
      },
    },
    list: {
      thumbnail: (title: string) => `Миниатюра для ${title}`,
      thumbnailUnavailable: (title: string) =>
        `Миниатюра недоступна для ${title}`,
      play: (title: string) => `Открыть ${title}`,
      columns: {
        video: 'Видео',
        details: 'Сведения',
        status: 'Статус',
        actions: 'Действия',
      },
    },
    actions: {
      menuLabel: (title: string) => `Действия для ${title}`,
      closeDialog: 'Закрыть диалог',
      open: 'Открыть',
      continue: 'Продолжить',
      rename: {
        action: 'Переименовать',
        title: 'Переименовать сохранённый анализ',
        description: 'Дайте анализу название, которое будет проще найти.',
        field: 'Название',
        empty: 'Введите название перед сохранением.',
        cancel: 'Отмена',
        saving: 'Сохранение…',
        save: 'Сохранить название',
      },
      delete: {
        action: 'Удалить',
        title: 'Удалить сохранённый анализ?',
        description: (title: string) =>
          `Удалить ${title} из истории? Это действие нельзя отменить.`,
        cancel: 'Отмена',
        deleting: 'Удаление…',
        confirm: 'Удалить анализ',
      },
      favorite: {
        addLabel: (title: string) => `Добавить ${title} в избранное`,
        removeLabel: (title: string) => `Удалить ${title} из избранного`,
      },
      duplicate: {
        label: 'Доступен сохранённый анализ',
        title: 'Вы уже анализировали это видео',
        reassurance: (details: string) =>
          `Откройте сохранённую версию${details ? `: ${details}` : ''}. Анализы не будут списаны.`,
        openSaved: 'Открыть сохранённый результат',
        analyzeAnother: 'Проанализировать другую версию',
        starting: 'Запуск другого анализа…',
        failed: 'Не удалось запустить другой анализ. Попробуйте снова.',
      },
      export: 'Экспорт',
      exportUnavailable: 'Экспорт недоступен',
    },
    loadMore: {
      loading: 'Загрузка…',
      action: 'Загрузить ещё',
      retry: 'Попробовать загрузить ещё раз',
      rejected: 'Не удалось загрузить больше анализов. Попробуйте снова.',
      more: (count: number) => `Загружено ещё анализов: ${count}.`,
    },
    toasts: {
      favoriteAdded: (title: string) => `${title} добавлено в избранное.`,
      favoriteRemoved: (title: string) => `${title} удалено из избранного.`,
      renamed: (title: string) => `${title} переименовано.`,
      deleted: (title: string) => `${title} удалено.`,
    },
    errors: {
      unauthorized: 'Сеанс завершён. Войдите и попробуйте снова.',
      'not-found': 'Этот сохранённый анализ больше недоступен.',
      invalid: 'Проверьте запрошенное изменение и попробуйте снова.',
      conflict:
        'Название изменено в другом месте. Обновите страницу и попробуйте снова.',
      failed: 'Не удалось обновить историю. Попробуйте снова.',
    },
  },
  es: {
    metadata: {
      title: 'Historial — Gleen',
      description: 'Encuentra y vuelve a abrir tus análisis guardados.',
    },
    presentation: {
      statuses: {
        ready: 'Listo',
        partial: 'Parcial',
        processing: 'Procesando',
        failed: 'Fallido',
      },
      presets: {
        compact: 'Compacto',
        balanced: 'Equilibrado',
        deep: 'Profundo',
      },
      dateUnavailable: 'Fecha no disponible',
    },
    page: {
      label: 'Historial',
      eyebrow: 'Tu biblioteca',
      title: 'Historial',
      description: 'Abre un resultado guardado sin gastar otro análisis.',
      newAnalysis: 'Nuevo análisis',
      noResults: 'No hay análisis guardados',
      resultCount: {
        one: '{count} análisis guardado',
        few: '{count} análisis guardados',
        many: '{count} análisis guardados',
        other: '{count} análisis guardados',
      },
    },
    toolbar: {
      searchLabel: 'Buscar en el historial',
      searchPlaceholder: 'Buscar por título, canal, URL o palabra clave',
      sortTrigger: (sort: string) => `Ordenar historial: ${sort}`,
      sortPrefix: 'Ordenar',
      sortMenuLabel: 'Ordenar historial',
      sorts: {
        newest: 'Más recientes',
        oldest: 'Más antiguos',
        recent: 'Abiertos recientemente',
        'title-asc': 'A–Z',
        'title-desc': 'Z–A',
      },
      historyView: 'Vista del historial',
      views: {
        list: 'Lista',
        listLabel: 'Vista de lista',
        grid: 'Cuadrícula',
        gridUnavailable: 'Vista de cuadrícula no disponible',
      },
    },
    filters: {
      desktopTrigger: 'Filtros',
      mobileTrigger: 'Filtro',
      triggerLabel: (mobile: boolean, count: number) => {
        const noun = mobile ? 'Filtro' : 'Filtros';
        return count === 0
          ? `${noun}, ninguno aplicado`
          : `${noun}, ${count} aplicados`;
      },
      panelTitle: 'Filtrar resultados',
      dialogTitle: 'Filtros',
      dialogDescription:
        'Ajusta los análisis guardados que aparecen en el historial.',
      close: 'Cerrar filtros',
      reset: 'Restablecer',
      clearAll: 'Borrar todo',
      apply: (count: number) => `Aplicar filtros (${count})`,
      appliedNote: (count: number) => `${count} filtros aplicados`,
      status: 'Estado',
      statuses: {
        ready: 'Listo',
        processing: 'Procesando',
        failed: 'Fallido',
      },
      language: 'Idioma',
      all: 'Todos',
      source: 'Fuente',
      allSources: 'Todas las fuentes',
      dateRange: 'Intervalo de fechas',
      dates: {
        all: 'Todo el tiempo',
        today: 'Hoy',
        '7d': 'Últimos 7 días',
        '30d': 'Últimos 30 días',
        year: 'Este año',
      },
      favoritesOnly: 'Solo favoritos',
      showFavoritesOnly: 'Mostrar solo favoritos',
    },
    empty: {
      search: {
        title: (query: string) => `No hay resultados para «${query}»`,
        description: 'Prueba con otro título, canal, URL o palabra clave.',
        clear: 'Borrar búsqueda',
      },
      filters: {
        title: 'Ningún análisis coincide con estos filtros',
        description:
          'Borra los filtros activos para ver más análisis guardados.',
        clear: 'Borrar filtros',
      },
      initial: {
        title: 'Aún no hay análisis',
        description: 'Tus análisis completados y en curso aparecerán aquí.',
        start: 'Iniciar un nuevo análisis',
      },
      error: {
        announcement: 'El historial no está disponible temporalmente.',
        title: 'El historial no está disponible',
        description: 'No pudimos cargar tus análisis guardados.',
        retry: 'Volver a intentarlo',
      },
    },
    list: {
      thumbnail: (title: string) => `Miniatura de ${title}`,
      thumbnailUnavailable: (title: string) =>
        `Miniatura no disponible para ${title}`,
      play: (title: string) => `Reproducir ${title}`,
      columns: {
        video: 'Vídeo',
        details: 'Detalles',
        status: 'Estado',
        actions: 'Acciones',
      },
    },
    actions: {
      menuLabel: (title: string) => `Acciones para ${title}`,
      closeDialog: 'Cerrar diálogo',
      open: 'Abrir',
      continue: 'Continuar',
      rename: {
        action: 'Cambiar nombre',
        title: 'Cambiar nombre del análisis guardado',
        description: 'Ponle un título que sea más fácil de encontrar.',
        field: 'Título',
        empty: 'Introduce un título antes de guardar.',
        cancel: 'Cancelar',
        saving: 'Guardando…',
        save: 'Guardar título',
      },
      delete: {
        action: 'Eliminar',
        title: '¿Eliminar el análisis guardado?',
        description: (title: string) =>
          `Elimina ${title} de tu historial. Esta acción no se puede deshacer.`,
        cancel: 'Cancelar',
        deleting: 'Eliminando…',
        confirm: 'Eliminar análisis',
      },
      favorite: {
        addLabel: (title: string) => `Añadir ${title} a favoritos`,
        removeLabel: (title: string) => `Quitar ${title} de favoritos`,
      },
      duplicate: {
        label: 'Análisis guardado disponible',
        title: 'Ya analizaste este vídeo',
        reassurance: (details: string) =>
          `Abre la versión guardada${details ? `: ${details}` : ''}. No se consumirá otro análisis.`,
        openSaved: 'Abrir resultado guardado',
        analyzeAnother: 'Analizar otra versión',
        starting: 'Iniciando otro análisis…',
        failed: 'No pudimos iniciar otro análisis. Vuelve a intentarlo.',
      },
      export: 'Exportar',
      exportUnavailable: 'Exportación no disponible',
    },
    loadMore: {
      loading: 'Cargando…',
      action: 'Cargar más',
      retry: 'Volver a intentar cargar más',
      rejected:
        'No pudimos cargar más análisis guardados. Vuelve a intentarlo.',
      more: (count: number) =>
        count === 1
          ? 'Se cargó 1 análisis guardado más.'
          : `Se cargaron ${count} análisis guardados más.`,
    },
    toasts: {
      favoriteAdded: (title: string) => `${title} se añadió a favoritos.`,
      favoriteRemoved: (title: string) => `${title} se quitó de favoritos.`,
      renamed: (title: string) => `${title} cambió de nombre.`,
      deleted: (title: string) => `${title} se eliminó.`,
    },
    errors: {
      unauthorized:
        'Tu sesión ha caducado. Inicia sesión y vuelve a intentarlo.',
      'not-found': 'Este análisis guardado ya no está disponible.',
      invalid: 'Revisa el cambio solicitado y vuelve a intentarlo.',
      conflict:
        'El título cambió en otro lugar. Actualiza la página y vuelve a intentarlo.',
      failed: 'No pudimos actualizar el historial. Vuelve a intentarlo.',
    },
  },
  de: {
    metadata: {
      title: 'Verlauf — Gleen',
      description: 'Finde und öffne deine gespeicherten Analysen erneut.',
    },
    presentation: {
      statuses: {
        ready: 'Bereit',
        partial: 'Teilweise',
        processing: 'In Bearbeitung',
        failed: 'Fehlgeschlagen',
      },
      presets: {
        compact: 'Kompakt',
        balanced: 'Ausgewogen',
        deep: 'Tiefgehend',
      },
      dateUnavailable: 'Datum nicht verfügbar',
    },
    page: {
      label: 'Verlauf',
      eyebrow: 'Deine Bibliothek',
      title: 'Verlauf',
      description:
        'Öffne ein gespeichertes Ergebnis, ohne eine weitere Analyse zu verbrauchen.',
      newAnalysis: 'Neue Analyse',
      noResults: 'Keine gespeicherten Analysen',
      resultCount: {
        one: '{count} gespeicherte Analyse',
        few: '{count} gespeicherte Analysen',
        many: '{count} gespeicherte Analysen',
        other: '{count} gespeicherte Analysen',
      },
    },
    toolbar: {
      searchLabel: 'Verlauf durchsuchen',
      searchPlaceholder: 'Nach Titel, Kanal, URL oder Stichwort suchen',
      sortTrigger: (sort: string) => `Verlauf sortieren: ${sort}`,
      sortPrefix: 'Sortieren',
      sortMenuLabel: 'Verlauf sortieren',
      sorts: {
        newest: 'Neueste',
        oldest: 'Älteste',
        recent: 'Zuletzt geöffnet',
        'title-asc': 'A–Z',
        'title-desc': 'Z–A',
      },
      historyView: 'Verlaufsansicht',
      views: {
        list: 'Liste',
        listLabel: 'Listenansicht',
        grid: 'Raster',
        gridUnavailable: 'Rasteransicht nicht verfügbar',
      },
    },
    filters: {
      desktopTrigger: 'Filter',
      mobileTrigger: 'Filter',
      triggerLabel: (_mobile: boolean, count: number) =>
        count === 0
          ? 'Filter, keine angewendet'
          : `Filter, ${count} angewendet`,
      panelTitle: 'Ergebnisse filtern',
      dialogTitle: 'Filter',
      dialogDescription:
        'Grenze die im Verlauf gezeigten gespeicherten Analysen ein.',
      close: 'Filter schließen',
      reset: 'Zurücksetzen',
      clearAll: 'Alle löschen',
      apply: (count: number) => `Filter anwenden (${count})`,
      appliedNote: (count: number) =>
        count === 1 ? '1 Filter angewendet' : `${count} Filter angewendet`,
      status: 'Status',
      statuses: {
        ready: 'Bereit',
        processing: 'In Bearbeitung',
        failed: 'Fehlgeschlagen',
      },
      language: 'Sprache',
      all: 'Alle',
      source: 'Quelle',
      allSources: 'Alle Quellen',
      dateRange: 'Zeitraum',
      dates: {
        all: 'Gesamter Zeitraum',
        today: 'Heute',
        '7d': 'Letzte 7 Tage',
        '30d': 'Letzte 30 Tage',
        year: 'Dieses Jahr',
      },
      favoritesOnly: 'Nur Favoriten',
      showFavoritesOnly: 'Nur Favoriten anzeigen',
    },
    empty: {
      search: {
        title: (query: string) => `Keine Ergebnisse für „${query}“`,
        description:
          'Versuche es mit einem anderen Titel, Kanal, einer URL oder einem Stichwort.',
        clear: 'Suche löschen',
      },
      filters: {
        title: 'Keine Analysen entsprechen diesen Filtern',
        description:
          'Lösche die aktiven Filter, um mehr gespeicherte Analysen zu sehen.',
        clear: 'Filter löschen',
      },
      initial: {
        title: 'Noch keine Analysen',
        description:
          'Deine abgeschlossenen und laufenden Analysen erscheinen hier.',
        start: 'Neue Analyse starten',
      },
      error: {
        announcement: 'Der Verlauf ist vorübergehend nicht verfügbar.',
        title: 'Der Verlauf ist nicht verfügbar',
        description:
          'Deine gespeicherten Analysen konnten nicht geladen werden.',
        retry: 'Erneut versuchen',
      },
    },
    list: {
      thumbnail: (title: string) => `Vorschaubild für ${title}`,
      thumbnailUnavailable: (title: string) =>
        `Vorschaubild für ${title} nicht verfügbar`,
      play: (title: string) => `${title} abspielen`,
      columns: {
        video: 'Video',
        details: 'Details',
        status: 'Status',
        actions: 'Aktionen',
      },
    },
    actions: {
      menuLabel: (title: string) => `Aktionen für ${title}`,
      closeDialog: 'Dialog schließen',
      open: 'Öffnen',
      continue: 'Fortsetzen',
      rename: {
        action: 'Umbenennen',
        title: 'Gespeicherte Analyse umbenennen',
        description:
          'Gib dieser Analyse einen Titel, der leichter zu finden ist.',
        field: 'Titel',
        empty: 'Gib vor dem Speichern einen Titel ein.',
        cancel: 'Abbrechen',
        saving: 'Wird gespeichert…',
        save: 'Titel speichern',
      },
      delete: {
        action: 'Löschen',
        title: 'Gespeicherte Analyse löschen?',
        description: (title: string) =>
          `Lösche ${title} aus deinem Verlauf. Dies kann nicht rückgängig gemacht werden.`,
        cancel: 'Abbrechen',
        deleting: 'Wird gelöscht…',
        confirm: 'Analyse löschen',
      },
      favorite: {
        addLabel: (title: string) => `${title} zu Favoriten hinzufügen`,
        removeLabel: (title: string) => `${title} aus Favoriten entfernen`,
      },
      duplicate: {
        label: 'Gespeicherte Analyse verfügbar',
        title: 'Du hast dieses Video bereits analysiert',
        reassurance: (details: string) =>
          `Öffne die gespeicherte Version${details ? `: ${details}` : ''}. Es wird keine weitere Analyse verbraucht.`,
        openSaved: 'Gespeichertes Ergebnis öffnen',
        analyzeAnother: 'Andere Version analysieren',
        starting: 'Weitere Analyse wird gestartet…',
        failed:
          'Eine weitere Analyse konnte nicht gestartet werden. Versuche es erneut.',
      },
      export: 'Exportieren',
      exportUnavailable: 'Export nicht verfügbar',
    },
    loadMore: {
      loading: 'Wird geladen…',
      action: 'Mehr laden',
      retry: 'Erneut mehr laden',
      rejected:
        'Weitere gespeicherte Analysen konnten nicht geladen werden. Versuche es erneut.',
      more: (count: number) =>
        count === 1
          ? '1 weitere gespeicherte Analyse geladen.'
          : `${count} weitere gespeicherte Analysen geladen.`,
    },
    toasts: {
      favoriteAdded: (title: string) =>
        `${title} wurde zu den Favoriten hinzugefügt.`,
      favoriteRemoved: (title: string) =>
        `${title} wurde aus den Favoriten entfernt.`,
      renamed: (title: string) => `${title} wurde umbenannt.`,
      deleted: (title: string) => `${title} wurde gelöscht.`,
    },
    errors: {
      unauthorized:
        'Deine Sitzung ist abgelaufen. Melde dich an und versuche es erneut.',
      'not-found': 'Diese gespeicherte Analyse ist nicht mehr verfügbar.',
      invalid: 'Prüfe die angeforderte Änderung und versuche es erneut.',
      conflict:
        'Der Titel wurde an anderer Stelle geändert. Aktualisiere die Seite und versuche es erneut.',
      failed:
        'Der Verlauf konnte nicht aktualisiert werden. Versuche es erneut.',
    },
  },
});

export type HistoryMessages = (typeof historyMessages)['en'];

export function historyResultCount(
  locale: Locale,
  copy: HistoryMessages,
  count: number,
): string {
  return count === 0
    ? copy.page.noResults
    : selectPlural(locale, count, copy.page.resultCount);
}
