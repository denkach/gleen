import { defineMessages } from '../catalog';

export type AuthErrorCode =
  | 'email_required'
  | 'email_too_long'
  | 'email_invalid'
  | 'password_too_short'
  | 'password_too_long'
  | 'password_letter_required'
  | 'password_number_required'
  | 'password_confirmation_mismatch'
  | 'invalid_credentials'
  | 'user_already_exists'
  | 'email_not_confirmed'
  | 'over_email_send_rate_limit'
  | 'weak_password'
  | 'auth_error';

export type AuthSuccessCode =
  | 'magic_link_sent'
  | 'verification_required'
  | 'reset_sent'
  | 'password_updated';

export type AuthActionCode = AuthErrorCode | AuthSuccessCode;

const authErrorCodes: readonly AuthErrorCode[] = [
  'email_required',
  'email_too_long',
  'email_invalid',
  'password_too_short',
  'password_too_long',
  'password_letter_required',
  'password_number_required',
  'password_confirmation_mismatch',
  'invalid_credentials',
  'user_already_exists',
  'email_not_confirmed',
  'over_email_send_rate_limit',
  'weak_password',
  'auth_error',
];

const authErrorCodeSet = new Set<string>(authErrorCodes);
const authSuccessCodeSet = new Set<string>([
  'magic_link_sent',
  'verification_required',
  'reset_sent',
  'password_updated',
]);

export const authMessages = defineMessages({
  en: {
    metadata: {
      signIn: 'Sign in — Gleen',
      signUp: 'Create account — Gleen',
      verifyEmail: 'Check your email — Gleen',
      forgotPassword: 'Reset your password — Gleen',
      resetPassword: 'Choose a new password — Gleen',
      sessionExpired: 'Session expired — Gleen',
    },
    shell: {
      visualLabel: 'Gleen knowledge workspace',
      homeLabel: 'Gleen home',
      eyebrow: 'Your knowledge workspace',
    },
    visual: {
      signInTitle: 'Return to the signal.',
      signInDescription:
        'Every analysis, card, timestamp, and export remains exactly where you left it.',
      signUpTitle: 'Begin with one link.',
      signUpDescription:
        'Your first video becomes a structured workspace in a few clear steps.',
      verifyTitle: 'Follow the beam.',
      verifyDescription: 'Your secure access link is on its way.',
      forgotTitle: 'Recover the signal.',
      forgotDescription:
        'A secure recovery link returns you to your workspace.',
      resetTitle: 'Restore access.',
      resetDescription:
        'Choose a new password to secure your knowledge workspace.',
      sessionTitle: 'Return to the signal.',
      sessionDescription:
        'Your work is safe. Sign in again to continue where you stopped.',
    },
    access: {
      eyebrow: 'Secure access',
      signInTitle: 'Sign in to Gleen',
      signUpTitle: 'Create your account',
      signInDescription:
        'Continue with Google or receive a secure link by email.',
      signUpDescription:
        'Start with Google or create an account using your email.',
      connectingGoogle: 'Connecting…',
      continueGoogle: 'Continue with Google',
      emailDivider: 'OR USE EMAIL',
      emailLabel: 'Email address',
      signInPassword: 'Sign in with password',
      createPassword: 'Create account with password',
      sendSignInLink: 'Send secure sign-in link',
      createWithEmail: 'Create account with email',
      pending: 'Please wait…',
      preferPassword: 'Prefer a password?',
      preferLink: 'Prefer a secure link?',
      usePassword: 'Use password instead',
      useLink: 'Use email link instead',
      forgotPassword: 'Forgot your password?',
      newToGleen: 'New to Gleen? ',
      createAccount: 'Create an account',
      existingAccount: 'Already have an account? ',
      signIn: 'Sign in',
      termsPrefix: 'By continuing, you agree to the ',
      terms: 'Terms',
      privacyConnector: ' and acknowledge the ',
      privacy: 'Privacy Policy',
      sentenceEnd: '.',
    },
    password: {
      label: 'Password',
      confirmLabel: 'Confirm password',
      requirements: 'Use at least eight characters with a letter and a number.',
    },
    screens: {
      verify: {
        eyebrow: 'Verification',
        title: 'Check your email',
        description:
          'Open the verification link in your inbox to continue securely.',
        action: 'Return to sign in',
      },
      forgot: {
        eyebrow: 'Account recovery',
        title: 'Reset your password',
        description:
          'Enter your account email and we will send a secure reset link.',
        emailLabel: 'Email address',
        sending: 'Sending…',
        submit: 'Send reset link',
        returnToSignIn: 'Return to sign in',
      },
      reset: {
        eyebrow: 'Secure recovery',
        title: 'Choose a new password',
        updating: 'Updating…',
        submit: 'Update password',
      },
      session: {
        eyebrow: 'Secure access',
        title: 'Your session expired',
        description:
          'For your security, please sign in again. Your saved work is unchanged.',
        action: 'Sign in again',
      },
    },
    successes: {
      magic_link_sent: 'Check your inbox for your secure sign-in link.',
      verification_required: 'Check your inbox to verify your email address.',
      reset_sent: 'Check your inbox for a password reset link.',
      password_updated: 'Your password has been updated.',
    },
    errors: {
      email_required: 'Enter your email address.',
      email_too_long: 'Email address is too long.',
      email_invalid: 'Enter a valid email address.',
      password_too_short: 'Use at least 8 characters.',
      password_too_long: 'Use no more than 72 characters.',
      password_letter_required: 'Add at least one letter.',
      password_number_required: 'Add at least one number.',
      password_confirmation_mismatch: 'Passwords do not match.',
      invalid_credentials: 'Email or password is incorrect.',
      user_already_exists: 'An account already exists for this email.',
      email_not_confirmed: 'Confirm your email before signing in.',
      over_email_send_rate_limit:
        'Please wait before requesting another email.',
      weak_password: 'Choose a stronger password and try again.',
      auth_error: 'We could not complete that request. Try again.',
    },
  },
  uk: {
    metadata: {
      signIn: 'Увійти — Gleen',
      signUp: 'Створити обліковий запис — Gleen',
      verifyEmail: 'Перевірте пошту — Gleen',
      forgotPassword: 'Відновити пароль — Gleen',
      resetPassword: 'Створити новий пароль — Gleen',
      sessionExpired: 'Сеанс завершено — Gleen',
    },
    shell: {
      visualLabel: 'Простір знань Gleen',
      homeLabel: 'Головна Gleen',
      eyebrow: 'Ваш простір знань',
    },
    visual: {
      signInTitle: 'Поверніться до сигналу.',
      signInDescription:
        'Кожен аналіз, картка, часова позначка й експорт залишилися там, де ви зупинилися.',
      signUpTitle: 'Почніть з одного посилання.',
      signUpDescription:
        'Ваше перше відео стане структурованим простором за кілька зрозумілих кроків.',
      verifyTitle: 'Ідіть за променем.',
      verifyDescription: 'Посилання для безпечного входу вже надсилається.',
      forgotTitle: 'Відновіть сигнал.',
      forgotDescription:
        'Безпечне посилання для відновлення поверне вас до робочого простору.',
      resetTitle: 'Відновіть доступ.',
      resetDescription:
        'Створіть новий пароль, щоб захистити свій простір знань.',
      sessionTitle: 'Поверніться до сигналу.',
      sessionDescription:
        'Ваші матеріали збережено. Увійдіть знову, щоб продовжити.',
    },
    access: {
      eyebrow: 'Безпечний доступ',
      signInTitle: 'Увійти в Gleen',
      signUpTitle: 'Створити обліковий запис',
      signInDescription:
        'Продовжте через Google або отримайте безпечне посилання електронною поштою.',
      signUpDescription:
        'Почніть із Google або створіть обліковий запис за допомогою електронної пошти.',
      connectingGoogle: 'Підключаємо…',
      continueGoogle: 'Продовжити з Google',
      emailDivider: 'АБО СКОРИСТАЙТЕСЯ ПОШТОЮ',
      emailLabel: 'Електронна пошта',
      signInPassword: 'Увійти з паролем',
      createPassword: 'Створити обліковий запис із паролем',
      sendSignInLink: 'Надіслати безпечне посилання',
      createWithEmail: 'Створити обліковий запис через пошту',
      pending: 'Зачекайте…',
      preferPassword: 'Віддаєте перевагу паролю?',
      preferLink: 'Віддаєте перевагу безпечному посиланню?',
      usePassword: 'Скористатися паролем',
      useLink: 'Скористатися посиланням',
      forgotPassword: 'Забули пароль?',
      newToGleen: 'Уперше в Gleen? ',
      createAccount: 'Створити обліковий запис',
      existingAccount: 'Уже маєте обліковий запис? ',
      signIn: 'Увійти',
      termsPrefix: 'Продовжуючи, ви погоджуєтеся з ',
      terms: 'Умовами',
      privacyConnector: ' та підтверджуєте ознайомлення з ',
      privacy: 'Політикою конфіденційності',
      sentenceEnd: '.',
    },
    password: {
      label: 'Пароль',
      confirmLabel: 'Підтвердьте пароль',
      requirements: 'Використайте щонайменше 8 символів, літеру й цифру.',
    },
    screens: {
      verify: {
        eyebrow: 'Підтвердження',
        title: 'Перевірте пошту',
        description:
          'Відкрийте посилання для підтвердження в листі, щоб безпечно продовжити.',
        action: 'Повернутися до входу',
      },
      forgot: {
        eyebrow: 'Відновлення облікового запису',
        title: 'Відновіть пароль',
        description:
          'Введіть електронну пошту облікового запису, і ми надішлемо безпечне посилання.',
        emailLabel: 'Електронна пошта',
        sending: 'Надсилаємо…',
        submit: 'Надіслати посилання',
        returnToSignIn: 'Повернутися до входу',
      },
      reset: {
        eyebrow: 'Безпечне відновлення',
        title: 'Створіть новий пароль',
        updating: 'Оновлюємо…',
        submit: 'Оновити пароль',
      },
      session: {
        eyebrow: 'Безпечний доступ',
        title: 'Ваш сеанс завершено',
        description:
          'Задля безпеки увійдіть знову. Ваші збережені матеріали не змінилися.',
        action: 'Увійти знову',
      },
    },
    successes: {
      magic_link_sent: 'Перевірте пошту: ми надіслали безпечне посилання.',
      verification_required:
        'Перевірте пошту, щоб підтвердити електронну адресу.',
      reset_sent: 'Перевірте пошту: ми надіслали посилання для відновлення.',
      password_updated: 'Ваш пароль оновлено.',
    },
    errors: {
      email_required: 'Введіть електронну адресу.',
      email_too_long: 'Електронна адреса задовга.',
      email_invalid: 'Введіть дійсну електронну адресу.',
      password_too_short: 'Використайте щонайменше 8 символів.',
      password_too_long: 'Використайте не більше 72 символів.',
      password_letter_required: 'Додайте щонайменше одну літеру.',
      password_number_required: 'Додайте щонайменше одну цифру.',
      password_confirmation_mismatch: 'Паролі не збігаються.',
      invalid_credentials: 'Електронна адреса або пароль неправильні.',
      user_already_exists: 'Для цієї електронної адреси вже є обліковий запис.',
      email_not_confirmed: 'Підтвердьте електронну адресу перед входом.',
      over_email_send_rate_limit: 'Зачекайте перед повторним запитом листа.',
      weak_password: 'Виберіть надійніший пароль і спробуйте ще раз.',
      auth_error: 'Не вдалося виконати запит. Спробуйте ще раз.',
    },
  },
  ru: {
    metadata: {
      signIn: 'Войти — Gleen',
      signUp: 'Создать аккаунт — Gleen',
      verifyEmail: 'Проверьте почту — Gleen',
      forgotPassword: 'Восстановить пароль — Gleen',
      resetPassword: 'Создать новый пароль — Gleen',
      sessionExpired: 'Сеанс завершён — Gleen',
    },
    shell: {
      visualLabel: 'Пространство знаний Gleen',
      homeLabel: 'Главная Gleen',
      eyebrow: 'Ваше пространство знаний',
    },
    visual: {
      signInTitle: 'Вернитесь к сигналу.',
      signInDescription:
        'Каждый анализ, карточка, метка времени и экспорт остались там, где вы остановились.',
      signUpTitle: 'Начните с одной ссылки.',
      signUpDescription:
        'Ваше первое видео станет структурированным пространством за несколько понятных шагов.',
      verifyTitle: 'Следуйте за лучом.',
      verifyDescription: 'Ссылка для безопасного входа уже отправлена.',
      forgotTitle: 'Восстановите сигнал.',
      forgotDescription:
        'Безопасная ссылка для восстановления вернёт вас в рабочее пространство.',
      resetTitle: 'Восстановите доступ.',
      resetDescription:
        'Создайте новый пароль, чтобы защитить пространство знаний.',
      sessionTitle: 'Вернитесь к сигналу.',
      sessionDescription:
        'Ваши материалы сохранены. Войдите снова, чтобы продолжить.',
    },
    access: {
      eyebrow: 'Безопасный доступ',
      signInTitle: 'Войти в Gleen',
      signUpTitle: 'Создать аккаунт',
      signInDescription:
        'Продолжите через Google или получите безопасную ссылку по электронной почте.',
      signUpDescription:
        'Начните с Google или создайте аккаунт с помощью электронной почты.',
      connectingGoogle: 'Подключаем…',
      continueGoogle: 'Продолжить с Google',
      emailDivider: 'ИЛИ ИСПОЛЬЗУЙТЕ ПОЧТУ',
      emailLabel: 'Электронная почта',
      signInPassword: 'Войти с паролем',
      createPassword: 'Создать аккаунт с паролем',
      sendSignInLink: 'Отправить безопасную ссылку',
      createWithEmail: 'Создать аккаунт через почту',
      pending: 'Подождите…',
      preferPassword: 'Предпочитаете пароль?',
      preferLink: 'Предпочитаете безопасную ссылку?',
      usePassword: 'Использовать пароль',
      useLink: 'Использовать ссылку',
      forgotPassword: 'Забыли пароль?',
      newToGleen: 'Впервые в Gleen? ',
      createAccount: 'Создать аккаунт',
      existingAccount: 'Уже есть аккаунт? ',
      signIn: 'Войти',
      termsPrefix: 'Продолжая, вы соглашаетесь с ',
      terms: 'Условиями',
      privacyConnector: ' и подтверждаете ознакомление с ',
      privacy: 'Политикой конфиденциальности',
      sentenceEnd: '.',
    },
    password: {
      label: 'Пароль',
      confirmLabel: 'Подтвердите пароль',
      requirements: 'Используйте не менее 8 символов, букву и цифру.',
    },
    screens: {
      verify: {
        eyebrow: 'Подтверждение',
        title: 'Проверьте почту',
        description:
          'Откройте ссылку подтверждения в письме, чтобы безопасно продолжить.',
        action: 'Вернуться ко входу',
      },
      forgot: {
        eyebrow: 'Восстановление аккаунта',
        title: 'Восстановите пароль',
        description:
          'Введите электронную почту аккаунта, и мы отправим безопасную ссылку.',
        emailLabel: 'Электронная почта',
        sending: 'Отправляем…',
        submit: 'Отправить ссылку',
        returnToSignIn: 'Вернуться ко входу',
      },
      reset: {
        eyebrow: 'Безопасное восстановление',
        title: 'Создайте новый пароль',
        updating: 'Обновляем…',
        submit: 'Обновить пароль',
      },
      session: {
        eyebrow: 'Безопасный доступ',
        title: 'Ваш сеанс завершён',
        description:
          'Для безопасности войдите снова. Ваши сохранённые материалы не изменились.',
        action: 'Войти снова',
      },
    },
    successes: {
      magic_link_sent: 'Проверьте почту: мы отправили безопасную ссылку.',
      verification_required: 'Проверьте почту, чтобы подтвердить адрес.',
      reset_sent: 'Проверьте почту: мы отправили ссылку восстановления.',
      password_updated: 'Ваш пароль обновлён.',
    },
    errors: {
      email_required: 'Введите электронный адрес.',
      email_too_long: 'Электронный адрес слишком длинный.',
      email_invalid: 'Введите действительный электронный адрес.',
      password_too_short: 'Используйте не менее 8 символов.',
      password_too_long: 'Используйте не более 72 символов.',
      password_letter_required: 'Добавьте хотя бы одну букву.',
      password_number_required: 'Добавьте хотя бы одну цифру.',
      password_confirmation_mismatch: 'Пароли не совпадают.',
      invalid_credentials: 'Электронный адрес или пароль неверны.',
      user_already_exists: 'Для этого адреса уже существует аккаунт.',
      email_not_confirmed: 'Подтвердите электронный адрес перед входом.',
      over_email_send_rate_limit: 'Подождите перед повторным запросом письма.',
      weak_password: 'Выберите более надёжный пароль и повторите попытку.',
      auth_error: 'Не удалось выполнить запрос. Попробуйте ещё раз.',
    },
  },
  es: {
    metadata: {
      signIn: 'Iniciar sesión — Gleen',
      signUp: 'Crear cuenta — Gleen',
      verifyEmail: 'Revisa tu correo — Gleen',
      forgotPassword: 'Restablecer contraseña — Gleen',
      resetPassword: 'Crear una contraseña nueva — Gleen',
      sessionExpired: 'Sesión caducada — Gleen',
    },
    shell: {
      visualLabel: 'Espacio de conocimiento de Gleen',
      homeLabel: 'Inicio de Gleen',
      eyebrow: 'Tu espacio de conocimiento',
    },
    visual: {
      signInTitle: 'Vuelve a la señal.',
      signInDescription:
        'Cada análisis, tarjeta, marca de tiempo y exportación sigue justo donde lo dejaste.',
      signUpTitle: 'Empieza con un enlace.',
      signUpDescription:
        'Tu primer vídeo se convierte en un espacio estructurado en unos pocos pasos claros.',
      verifyTitle: 'Sigue el haz.',
      verifyDescription: 'Tu enlace de acceso seguro está en camino.',
      forgotTitle: 'Recupera la señal.',
      forgotDescription:
        'Un enlace de recuperación seguro te devolverá a tu espacio de trabajo.',
      resetTitle: 'Recupera el acceso.',
      resetDescription:
        'Crea una contraseña nueva para proteger tu espacio de conocimiento.',
      sessionTitle: 'Vuelve a la señal.',
      sessionDescription:
        'Tu trabajo está a salvo. Inicia sesión de nuevo para continuar.',
    },
    access: {
      eyebrow: 'Acceso seguro',
      signInTitle: 'Inicia sesión en Gleen',
      signUpTitle: 'Crea tu cuenta',
      signInDescription:
        'Continúa con Google o recibe un enlace seguro por correo.',
      signUpDescription: 'Empieza con Google o crea una cuenta con tu correo.',
      connectingGoogle: 'Conectando…',
      continueGoogle: 'Continuar con Google',
      emailDivider: 'O USA EL CORREO',
      emailLabel: 'Correo electrónico',
      signInPassword: 'Iniciar sesión con contraseña',
      createPassword: 'Crear cuenta con contraseña',
      sendSignInLink: 'Enviar enlace de acceso seguro',
      createWithEmail: 'Crear cuenta con correo',
      pending: 'Espera…',
      preferPassword: '¿Prefieres una contraseña?',
      preferLink: '¿Prefieres un enlace seguro?',
      usePassword: 'Usar contraseña',
      useLink: 'Usar enlace por correo',
      forgotPassword: '¿Has olvidado tu contraseña?',
      newToGleen: '¿Eres nuevo en Gleen? ',
      createAccount: 'Crear una cuenta',
      existingAccount: '¿Ya tienes una cuenta? ',
      signIn: 'Iniciar sesión',
      termsPrefix: 'Al continuar, aceptas los ',
      terms: 'Términos',
      privacyConnector: ' y confirmas que conoces la ',
      privacy: 'Política de privacidad',
      sentenceEnd: '.',
    },
    password: {
      label: 'Contraseña',
      confirmLabel: 'Confirmar contraseña',
      requirements: 'Usa al menos 8 caracteres, una letra y un número.',
    },
    screens: {
      verify: {
        eyebrow: 'Verificación',
        title: 'Revisa tu correo',
        description:
          'Abre el enlace de verificación del correo para continuar de forma segura.',
        action: 'Volver al inicio de sesión',
      },
      forgot: {
        eyebrow: 'Recuperación de cuenta',
        title: 'Restablece tu contraseña',
        description:
          'Introduce el correo de tu cuenta y te enviaremos un enlace seguro.',
        emailLabel: 'Correo electrónico',
        sending: 'Enviando…',
        submit: 'Enviar enlace',
        returnToSignIn: 'Volver al inicio de sesión',
      },
      reset: {
        eyebrow: 'Recuperación segura',
        title: 'Crea una contraseña nueva',
        updating: 'Actualizando…',
        submit: 'Actualizar contraseña',
      },
      session: {
        eyebrow: 'Acceso seguro',
        title: 'Tu sesión ha caducado',
        description:
          'Por seguridad, inicia sesión de nuevo. Tu trabajo guardado no ha cambiado.',
        action: 'Iniciar sesión de nuevo',
      },
    },
    successes: {
      magic_link_sent: 'Revisa tu correo para ver el enlace de acceso seguro.',
      verification_required:
        'Revisa tu correo para confirmar tu dirección de correo electrónico.',
      reset_sent: 'Revisa tu correo para ver el enlace de restablecimiento.',
      password_updated: 'Tu contraseña se ha actualizado.',
    },
    errors: {
      email_required: 'Introduce tu correo electrónico.',
      email_too_long: 'El correo electrónico es demasiado largo.',
      email_invalid: 'Introduce un correo electrónico válido.',
      password_too_short: 'Usa al menos 8 caracteres.',
      password_too_long: 'Usa como máximo 72 caracteres.',
      password_letter_required: 'Añade al menos una letra.',
      password_number_required: 'Añade al menos un número.',
      password_confirmation_mismatch: 'Las contraseñas no coinciden.',
      invalid_credentials: 'El correo o la contraseña son incorrectos.',
      user_already_exists: 'Ya existe una cuenta con este correo.',
      email_not_confirmed: 'Confirma tu correo antes de iniciar sesión.',
      over_email_send_rate_limit: 'Espera antes de solicitar otro correo.',
      weak_password: 'Elige una contraseña más segura e inténtalo de nuevo.',
      auth_error: 'No hemos podido completar la solicitud. Inténtalo de nuevo.',
    },
  },
  de: {
    metadata: {
      signIn: 'Anmelden — Gleen',
      signUp: 'Konto erstellen — Gleen',
      verifyEmail: 'E-Mail prüfen — Gleen',
      forgotPassword: 'Passwort zurücksetzen — Gleen',
      resetPassword: 'Neues Passwort wählen — Gleen',
      sessionExpired: 'Sitzung abgelaufen — Gleen',
    },
    shell: {
      visualLabel: 'Gleen-Wissensarbeitsbereich',
      homeLabel: 'Gleen-Startseite',
      eyebrow: 'Dein Wissensarbeitsbereich',
    },
    visual: {
      signInTitle: 'Zurück zum Signal.',
      signInDescription:
        'Jede Analyse, Lernkarte, Zeitmarke und jeder Export sind noch genau dort, wo du aufgehört hast.',
      signUpTitle: 'Beginne mit einem Link.',
      signUpDescription:
        'Dein erstes Video wird in wenigen klaren Schritten zu einem strukturierten Arbeitsbereich.',
      verifyTitle: 'Folge dem Lichtstrahl.',
      verifyDescription: 'Dein sicherer Zugangslink ist unterwegs.',
      forgotTitle: 'Stelle das Signal wieder her.',
      forgotDescription:
        'Ein sicherer Wiederherstellungslink bringt dich zurück in deinen Arbeitsbereich.',
      resetTitle: 'Stelle den Zugang wieder her.',
      resetDescription:
        'Wähle ein neues Passwort, um deinen Wissensarbeitsbereich zu schützen.',
      sessionTitle: 'Zurück zum Signal.',
      sessionDescription:
        'Deine Arbeit ist sicher. Melde dich erneut an, um fortzufahren.',
    },
    access: {
      eyebrow: 'Sicherer Zugang',
      signInTitle: 'Bei Gleen anmelden',
      signUpTitle: 'Konto erstellen',
      signInDescription:
        'Fahre mit Google fort oder erhalte einen sicheren Link per E-Mail.',
      signUpDescription:
        'Beginne mit Google oder erstelle ein Konto mit deiner E-Mail-Adresse.',
      connectingGoogle: 'Verbindung wird hergestellt…',
      continueGoogle: 'Mit Google fortfahren',
      emailDivider: 'ODER E-MAIL VERWENDEN',
      emailLabel: 'E-Mail-Adresse',
      signInPassword: 'Mit Passwort anmelden',
      createPassword: 'Konto mit Passwort erstellen',
      sendSignInLink: 'Sicheren Anmeldelink senden',
      createWithEmail: 'Konto mit E-Mail erstellen',
      pending: 'Bitte warten…',
      preferPassword: 'Lieber ein Passwort?',
      preferLink: 'Lieber einen sicheren Link?',
      usePassword: 'Stattdessen Passwort verwenden',
      useLink: 'Stattdessen E-Mail-Link verwenden',
      forgotPassword: 'Passwort vergessen?',
      newToGleen: 'Neu bei Gleen? ',
      createAccount: 'Konto erstellen',
      existingAccount: 'Du hast bereits ein Konto? ',
      signIn: 'Anmelden',
      termsPrefix: 'Wenn du fortfährst, stimmst du den ',
      terms: 'Bedingungen',
      privacyConnector: ' zu und bestätigst die ',
      privacy: 'Datenschutzerklärung',
      sentenceEnd: '.',
    },
    password: {
      label: 'Passwort',
      confirmLabel: 'Passwort bestätigen',
      requirements:
        'Verwende mindestens 8 Zeichen, einen Buchstaben und eine Zahl.',
    },
    screens: {
      verify: {
        eyebrow: 'Bestätigung',
        title: 'Prüfe deine E-Mail',
        description:
          'Öffne den Bestätigungslink in deinem Postfach, um sicher fortzufahren.',
        action: 'Zurück zur Anmeldung',
      },
      forgot: {
        eyebrow: 'Kontowiederherstellung',
        title: 'Passwort zurücksetzen',
        description:
          'Gib die E-Mail-Adresse deines Kontos ein. Wir senden dir einen sicheren Link.',
        emailLabel: 'E-Mail-Adresse',
        sending: 'Wird gesendet…',
        submit: 'Link zum Zurücksetzen senden',
        returnToSignIn: 'Zurück zur Anmeldung',
      },
      reset: {
        eyebrow: 'Sichere Wiederherstellung',
        title: 'Neues Passwort wählen',
        updating: 'Wird aktualisiert…',
        submit: 'Passwort aktualisieren',
      },
      session: {
        eyebrow: 'Sicherer Zugang',
        title: 'Deine Sitzung ist abgelaufen',
        description:
          'Melde dich zu deiner Sicherheit erneut an. Deine gespeicherte Arbeit bleibt unverändert.',
        action: 'Erneut anmelden',
      },
    },
    successes: {
      magic_link_sent:
        'In deinem Postfach findest du deinen sicheren Anmeldelink.',
      verification_required:
        'Prüfe dein Postfach, um deine E-Mail-Adresse zu bestätigen.',
      reset_sent: 'In deinem Postfach findest du den Link zum Zurücksetzen.',
      password_updated: 'Dein Passwort wurde aktualisiert.',
    },
    errors: {
      email_required: 'Gib deine E-Mail-Adresse ein.',
      email_too_long: 'Die E-Mail-Adresse ist zu lang.',
      email_invalid: 'Gib eine gültige E-Mail-Adresse ein.',
      password_too_short: 'Verwende mindestens 8 Zeichen.',
      password_too_long: 'Verwende höchstens 72 Zeichen.',
      password_letter_required: 'Füge mindestens einen Buchstaben hinzu.',
      password_number_required: 'Füge mindestens eine Zahl hinzu.',
      password_confirmation_mismatch: 'Die Passwörter stimmen nicht überein.',
      invalid_credentials: 'E-Mail-Adresse oder Passwort ist falsch.',
      user_already_exists:
        'Für diese E-Mail-Adresse besteht bereits ein Konto.',
      email_not_confirmed: 'Bestätige deine E-Mail-Adresse vor der Anmeldung.',
      over_email_send_rate_limit:
        'Warte, bevor du eine weitere E-Mail anforderst.',
      weak_password: 'Wähle ein stärkeres Passwort und versuche es erneut.',
      auth_error:
        'Die Anfrage konnte nicht abgeschlossen werden. Bitte versuche es erneut.',
    },
  },
});

export type AuthCopy = (typeof authMessages)['en'];

export function isAuthErrorCode(
  code: string | undefined,
): code is AuthErrorCode {
  return code !== undefined && authErrorCodeSet.has(code);
}

export function isAuthSuccessCode(
  code: string | undefined,
): code is AuthSuccessCode {
  return code !== undefined && authSuccessCodeSet.has(code);
}

export function authErrorMessage(
  copy: AuthCopy,
  code: string | undefined,
): string {
  return copy.errors[isAuthErrorCode(code) ? code : 'auth_error'];
}

export function authSuccessMessage(
  copy: AuthCopy,
  code: AuthSuccessCode,
): string {
  return copy.successes[code];
}
