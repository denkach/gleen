import { resultCopy } from '@/lib/result-workspace/copy';

export default function PublicResultNotFound() {
  return (
    <main className="result-public-unavailable">
      <section>
        <h1>{resultCopy.en.publicViewUnavailable}</h1>
        <p>{resultCopy.en.publicViewExpired}</p>
      </section>
    </main>
  );
}
