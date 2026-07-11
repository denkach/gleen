import { MarketingIcon } from './marketing-icon';

export function BeamInput() {
  return (
    <form className="beam-form" aria-label="Analyze a YouTube video">
      <label className="sr-only" htmlFor="youtube-url">
        YouTube URL
      </label>
      <MarketingIcon className="icon link-icon" name="link" />
      <input
        id="youtube-url"
        name="url"
        type="url"
        placeholder="Paste a YouTube link"
        required
      />
      <button className="btn btn-primary" type="submit">
        Transform video <MarketingIcon className="icon icon-sm" name="arrow" />
      </button>
    </form>
  );
}
