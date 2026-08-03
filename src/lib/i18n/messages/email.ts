import { defineMessages } from '../catalog';

export const emailMessages = defineMessages({
  en: {
    magicLink: {
      subject: 'Your Gleen sign-in link',
      preview: 'Use this secure link to sign in to Gleen.',
      heading: 'Sign in to Gleen',
      paragraphs: {
        intro: 'Use the button below to sign in to your account.',
        security:
          'If you did not request this link, you can ignore this email.',
      },
      actionLabel: 'Sign in',
    },
    verifyEmail: {
      subject: 'Verify your email address',
      preview: 'Confirm your email address to finish setting up Gleen.',
      heading: 'Verify your email',
      paragraphs: {
        intro: 'Confirm your email address to finish setting up your account.',
        security:
          'If you did not create a Gleen account, you can ignore this email.',
      },
      actionLabel: 'Verify email',
    },
    passwordReset: {
      subject: 'Reset your Gleen password',
      preview: 'Use this secure link to choose a new password.',
      heading: 'Reset your password',
      paragraphs: {
        intro:
          'Use the button below to choose a new password for your account.',
        security:
          'If you did not request a password reset, you can ignore this email.',
      },
      actionLabel: 'Reset password',
    },
    analysisReady: {
      subject: (title: string) => `Your analysis is ready: ${title}`,
      preview: (title: string) =>
        `Explore the completed analysis for ${title}.`,
      heading: 'Your analysis is ready',
      paragraphs: {
        intro: (title: string) => `Your analysis of ${title} is ready.`,
        artifacts:
          'Your summary, flashcards, timestamps, transcript, and exports are ready.',
      },
      actionLabel: 'Open analysis',
    },
    paymentFailed: {
      subject: (planName: string) => `Payment failed for ${planName}`,
      preview: (planName: string) =>
        `Review the payment details for ${planName}.`,
      heading: 'Your payment could not be processed',
      paragraphs: {
        intro: (planName: string) =>
          `We could not process the payment for ${planName}.`,
        guidance:
          'Review your payment method to keep your subscription in good standing.',
      },
      actionLabel: 'Review billing',
    },
    subscriptionChanged: {
      subject: (planName: string) =>
        `Your subscription is changing to ${planName}`,
      preview: (planName: string) =>
        `Review your upcoming subscription change to ${planName}.`,
      heading: 'Your subscription is changing',
      paragraphs: {
        intro: (planName: string, effectiveAt: string) =>
          `Your subscription will change to ${planName} on ${effectiveAt}.`,
        guidance:
          'You can review your plan and billing details before the change takes effect.',
      },
      actionLabel: 'Review subscription',
    },
  },
  uk: {
    magicLink: {
      subject: 'Ваше посилання для входу в Gleen',
      preview: 'Скористайтеся безпечним посиланням, щоб увійти в Gleen.',
      heading: 'Увійдіть у Gleen',
      paragraphs: {
        intro: 'Натисніть кнопку нижче, щоб увійти у свій обліковий запис.',
        security:
          'Якщо ви не запитували це посилання, можете проігнорувати цей лист.',
      },
      actionLabel: 'Увійти',
    },
    verifyEmail: {
      subject: 'Підтвердьте електронну адресу',
      preview:
        'Підтвердьте електронну адресу, щоб завершити налаштування Gleen.',
      heading: 'Підтвердьте електронну адресу',
      paragraphs: {
        intro:
          'Підтвердьте електронну адресу, щоб завершити налаштування облікового запису.',
        security:
          'Якщо ви не створювали обліковий запис Gleen, можете проігнорувати цей лист.',
      },
      actionLabel: 'Підтвердити адресу',
    },
    passwordReset: {
      subject: 'Скиньте пароль Gleen',
      preview: 'Скористайтеся безпечним посиланням, щоб вибрати новий пароль.',
      heading: 'Скиньте пароль',
      paragraphs: {
        intro:
          'Натисніть кнопку нижче, щоб вибрати новий пароль для свого облікового запису.',
        security:
          'Якщо ви не запитували скидання пароля, можете проігнорувати цей лист.',
      },
      actionLabel: 'Скинути пароль',
    },
    analysisReady: {
      subject: (title: string) => `Ваш аналіз готовий: ${title}`,
      preview: (title: string) => `Перегляньте готовий аналіз відео ${title}.`,
      heading: 'Ваш аналіз готовий',
      paragraphs: {
        intro: (title: string) => `Ваш аналіз відео ${title} готовий.`,
        artifacts:
          'Ваші резюме, картки, часові мітки, транскрипт і експорти готові.',
      },
      actionLabel: 'Відкрити аналіз',
    },
    paymentFailed: {
      subject: (planName: string) => `Не вдалося оплатити ${planName}`,
      preview: (planName: string) =>
        `Перевірте платіжні дані для плану ${planName}.`,
      heading: 'Не вдалося обробити платіж',
      paragraphs: {
        intro: (planName: string) =>
          `Не вдалося обробити платіж за план ${planName}.`,
        guidance:
          'Перевірте спосіб оплати, щоб ваша підписка залишалася активною.',
      },
      actionLabel: 'Перевірити оплату',
    },
    subscriptionChanged: {
      subject: (planName: string) => `Ваша підписка змінюється на ${planName}`,
      preview: (planName: string) =>
        `Перегляньте майбутню зміну підписки на ${planName}.`,
      heading: 'Ваша підписка змінюється',
      paragraphs: {
        intro: (planName: string, effectiveAt: string) =>
          `Вашу підписку буде змінено на ${planName} ${effectiveAt}.`,
        guidance:
          'Ви можете переглянути план і платіжні дані до того, як зміна набуде чинності.',
      },
      actionLabel: 'Переглянути підписку',
    },
  },
  ru: {
    magicLink: {
      subject: 'Ваша ссылка для входа в Gleen',
      preview: 'Используйте безопасную ссылку, чтобы войти в Gleen.',
      heading: 'Войдите в Gleen',
      paragraphs: {
        intro: 'Нажмите кнопку ниже, чтобы войти в свою учётную запись.',
        security:
          'Если вы не запрашивали эту ссылку, можете проигнорировать письмо.',
      },
      actionLabel: 'Войти',
    },
    verifyEmail: {
      subject: 'Подтвердите адрес электронной почты',
      preview:
        'Подтвердите адрес электронной почты, чтобы завершить настройку Gleen.',
      heading: 'Подтвердите адрес электронной почты',
      paragraphs: {
        intro:
          'Подтвердите адрес электронной почты, чтобы завершить настройку учётной записи.',
        security:
          'Если вы не создавали учётную запись Gleen, можете проигнорировать письмо.',
      },
      actionLabel: 'Подтвердить адрес',
    },
    passwordReset: {
      subject: 'Сбросьте пароль Gleen',
      preview: 'Используйте безопасную ссылку, чтобы выбрать новый пароль.',
      heading: 'Сбросьте пароль',
      paragraphs: {
        intro:
          'Нажмите кнопку ниже, чтобы выбрать новый пароль для своей учётной записи.',
        security:
          'Если вы не запрашивали сброс пароля, можете проигнорировать письмо.',
      },
      actionLabel: 'Сбросить пароль',
    },
    analysisReady: {
      subject: (title: string) => `Ваш анализ готов: ${title}`,
      preview: (title: string) => `Откройте готовый анализ видео ${title}.`,
      heading: 'Ваш анализ готов',
      paragraphs: {
        intro: (title: string) => `Ваш анализ видео ${title} готов.`,
        artifacts:
          'Ваши резюме, карточки, временные метки, транскрипт и экспорты готовы.',
      },
      actionLabel: 'Открыть анализ',
    },
    paymentFailed: {
      subject: (planName: string) => `Не удалось оплатить ${planName}`,
      preview: (planName: string) =>
        `Проверьте платёжные данные для плана ${planName}.`,
      heading: 'Не удалось обработать платёж',
      paragraphs: {
        intro: (planName: string) =>
          `Не удалось обработать платёж за план ${planName}.`,
        guidance:
          'Проверьте способ оплаты, чтобы ваша подписка оставалась активной.',
      },
      actionLabel: 'Проверить оплату',
    },
    subscriptionChanged: {
      subject: (planName: string) => `Ваша подписка меняется на ${planName}`,
      preview: (planName: string) =>
        `Проверьте предстоящее изменение подписки на ${planName}.`,
      heading: 'Ваша подписка меняется',
      paragraphs: {
        intro: (planName: string, effectiveAt: string) =>
          `Ваша подписка изменится на ${planName} ${effectiveAt}.`,
        guidance:
          'Вы можете проверить план и платёжные данные до того, как изменение вступит в силу.',
      },
      actionLabel: 'Проверить подписку',
    },
  },
  es: {
    magicLink: {
      subject: 'Tu enlace para iniciar sesión en Gleen',
      preview: 'Usa este enlace seguro para iniciar sesión en Gleen.',
      heading: 'Inicia sesión en Gleen',
      paragraphs: {
        intro: 'Usa el botón de abajo para iniciar sesión en tu cuenta.',
        security:
          'Si no has solicitado este enlace, puedes ignorar este correo.',
      },
      actionLabel: 'Iniciar sesión',
    },
    verifyEmail: {
      subject: 'Verifica tu correo electrónico',
      preview:
        'Confirma tu correo electrónico para terminar de configurar Gleen.',
      heading: 'Verifica tu correo electrónico',
      paragraphs: {
        intro:
          'Confirma tu correo electrónico para terminar de configurar tu cuenta.',
        security:
          'Si no has creado una cuenta de Gleen, puedes ignorar este correo.',
      },
      actionLabel: 'Verificar correo',
    },
    passwordReset: {
      subject: 'Restablece tu contraseña de Gleen',
      preview: 'Usa este enlace seguro para elegir una contraseña nueva.',
      heading: 'Restablece tu contraseña',
      paragraphs: {
        intro:
          'Usa el botón de abajo para elegir una contraseña nueva para tu cuenta.',
        security:
          'Si no has solicitado restablecer tu contraseña, puedes ignorar este correo.',
      },
      actionLabel: 'Restablecer contraseña',
    },
    analysisReady: {
      subject: (title: string) => `Tu análisis está listo: ${title}`,
      preview: (title: string) =>
        `Explora el análisis completo del vídeo ${title}.`,
      heading: 'Tu análisis está listo',
      paragraphs: {
        intro: (title: string) => `El análisis del vídeo ${title} está listo.`,
        artifacts:
          'Tu resumen, tarjetas, marcas de tiempo, transcripción y exportaciones están listos.',
      },
      actionLabel: 'Abrir análisis',
    },
    paymentFailed: {
      subject: (planName: string) => `Error en el pago de ${planName}`,
      preview: (planName: string) => `Revisa los datos de pago de ${planName}.`,
      heading: 'No se ha podido procesar el pago',
      paragraphs: {
        intro: (planName: string) =>
          `No hemos podido procesar el pago de ${planName}.`,
        guidance:
          'Revisa tu método de pago para mantener tu suscripción al día.',
      },
      actionLabel: 'Revisar facturación',
    },
    subscriptionChanged: {
      subject: (planName: string) => `Tu suscripción cambiará a ${planName}`,
      preview: (planName: string) =>
        `Revisa el próximo cambio de tu suscripción a ${planName}.`,
      heading: 'Tu suscripción va a cambiar',
      paragraphs: {
        intro: (planName: string, effectiveAt: string) =>
          `Tu suscripción cambiará a ${planName} el ${effectiveAt}.`,
        guidance:
          'Puedes revisar tu plan y tus datos de pago antes de que se aplique el cambio.',
      },
      actionLabel: 'Revisar suscripción',
    },
  },
  de: {
    magicLink: {
      subject: 'Dein Link zur Anmeldung bei Gleen',
      preview: 'Melde dich über diesen sicheren Link bei Gleen an.',
      heading: 'Bei Gleen anmelden',
      paragraphs: {
        intro: 'Melde dich über die Schaltfläche unten bei deinem Konto an.',
        security:
          'Wenn du diesen Link nicht angefordert hast, kannst du diese E-Mail ignorieren.',
      },
      actionLabel: 'Anmelden',
    },
    verifyEmail: {
      subject: 'Bestätige deine E-Mail-Adresse',
      preview:
        'Bestätige deine E-Mail-Adresse, um die Einrichtung von Gleen abzuschließen.',
      heading: 'E-Mail-Adresse bestätigen',
      paragraphs: {
        intro:
          'Bestätige deine E-Mail-Adresse, um die Einrichtung deines Kontos abzuschließen.',
        security:
          'Wenn du kein Gleen-Konto erstellt hast, kannst du diese E-Mail ignorieren.',
      },
      actionLabel: 'E-Mail bestätigen',
    },
    passwordReset: {
      subject: 'Setze dein Gleen-Passwort zurück',
      preview: 'Lege über diesen sicheren Link ein neues Passwort fest.',
      heading: 'Passwort zurücksetzen',
      paragraphs: {
        intro:
          'Lege über die Schaltfläche unten ein neues Passwort für dein Konto fest.',
        security:
          'Wenn du kein neues Passwort angefordert hast, kannst du diese E-Mail ignorieren.',
      },
      actionLabel: 'Passwort zurücksetzen',
    },
    analysisReady: {
      subject: (title: string) => `Deine Analyse ist fertig: ${title}`,
      preview: (title: string) =>
        `Entdecke die fertige Analyse des Videos ${title}.`,
      heading: 'Deine Analyse ist fertig',
      paragraphs: {
        intro: (title: string) =>
          `Deine Analyse des Videos ${title} ist fertig.`,
        artifacts:
          'Deine Zusammenfassung, Lernkarten, Zeitmarken, dein Transkript und deine Exporte sind fertig.',
      },
      actionLabel: 'Analyse öffnen',
    },
    paymentFailed: {
      subject: (planName: string) => `Zahlung für ${planName} fehlgeschlagen`,
      preview: (planName: string) =>
        `Überprüfe die Zahlungsdaten für ${planName}.`,
      heading: 'Deine Zahlung konnte nicht verarbeitet werden',
      paragraphs: {
        intro: (planName: string) =>
          `Die Zahlung für ${planName} konnte nicht verarbeitet werden.`,
        guidance:
          'Überprüfe deine Zahlungsmethode, damit dein Abonnement ordnungsgemäß weiterläuft.',
      },
      actionLabel: 'Abrechnung prüfen',
    },
    subscriptionChanged: {
      subject: (planName: string) => `Dein Abonnement wechselt zu ${planName}`,
      preview: (planName: string) =>
        `Prüfe den bevorstehenden Wechsel deines Abonnements zu ${planName}.`,
      heading: 'Dein Abonnement ändert sich',
      paragraphs: {
        intro: (planName: string, effectiveAt: string) =>
          `Dein Abonnement wechselt am ${effectiveAt} zu ${planName}.`,
        guidance:
          'Du kannst deinen Tarif und deine Zahlungsdaten prüfen, bevor die Änderung wirksam wird.',
      },
      actionLabel: 'Abonnement prüfen',
    },
  },
});

export type EmailMessages = (typeof emailMessages)['en'];
