import { resultMessages } from '@/lib/i18n/messages/results';
import { getRequestLocale } from '@/lib/i18n/request-locale';

export default async function PublicResultNotFound() {
  const locale = await getRequestLocale();
  const copy = resultMessages[locale];

  return (
    <main className="result-public-unavailable">
      <section>
        <h1>{copy.publicViewUnavailable}</h1>
        <p>{copy.publicViewExpired}</p>
      </section>
    </main>
  );
}
