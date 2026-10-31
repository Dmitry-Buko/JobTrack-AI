interface ErrorLike {
  message?: unknown;
  code?: unknown;
  status?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Известные коды Supabase Auth → понятные сообщения на русском. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Неверный email или пароль.',
  email_not_confirmed:
    'Email не подтверждён. Проверьте почту — мы отправили ссылку для подтверждения.',
  user_already_exists: 'Пользователь с таким email уже зарегистрирован.',
  weak_password: 'Пароль слишком простой. Используйте минимум 6 символов.',
  over_email_send_rate_limit:
    'Слишком много писем подряд. Подождите немного и попробуйте снова.',
  same_password: 'Новый пароль совпадает с текущим.',
  user_not_found: 'Пользователь с таким email не найден.',
};

/** Сообщения Supabase Auth на английском → русский (для ошибок без кода). */
const MESSAGE_TRANSLATIONS: Record<string, string> = {
  'Email not confirmed':
    'Email не подтверждён. Проверьте почту — мы отправили ссылку для подтверждения.',
  'Invalid login credentials': 'Неверный email или пароль.',
  'User already registered': 'Пользователь с таким email уже зарегистрирован.',
  'Password should be at least 6 characters':
    'Пароль слишком простой. Используйте минимум 6 символов.',
  'New password should be different from the old password.':
    'Новый пароль совпадает с текущим.',
};

export function getErrorMessage(
  error: unknown,
  fallback = 'Что-то пошло не так. Попробуйте ещё раз.',
): string {
  if (typeof error === 'string' && error.trim()) return error;

  if (isObject(error)) {
    const like = error as ErrorLike;
    const code = typeof like.code === 'string' ? like.code : null;

    if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];

    if (typeof like.message === 'string' && like.message.trim()) {
      const message = like.message;
      if (message === 'Failed to fetch') {
        return 'Нет соединения с сервером. Проверьте подключение к интернету.';
      }
      if (message.includes('Unexpected token') || message.includes('invalid JSON')) {
        return 'Сервер вернул некорректный ответ. Попробуйте позже.';
      }
      if (MESSAGE_TRANSLATIONS[message]) return MESSAGE_TRANSLATIONS[message];
      if (message.includes('is invalid') && message.includes('Email address')) {
        return 'Supabase отклонил этот email-адрес. Используйте настоящий адрес почты.';
      }
      return message;
    }
  }

  return fallback;
}
