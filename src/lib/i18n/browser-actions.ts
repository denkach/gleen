import type { LocaleActionState } from './actions';

export async function setInterfaceLocale(
  _previousState: LocaleActionState,
  formData: FormData,
): Promise<LocaleActionState> {
  try {
    const response = await fetch('/api/interface-locale', {
      body: JSON.stringify({ locale: formData.get('locale') }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    const result: unknown = await response.json();
    if (
      result &&
      typeof result === 'object' &&
      'status' in result &&
      (result.status === 'success' || result.status === 'error')
    ) {
      return result as LocaleActionState;
    }
  } catch {
    // The optimistic browser locale remains authoritative on network failure.
  }

  return { status: 'error', code: 'profile_update_failed' };
}
