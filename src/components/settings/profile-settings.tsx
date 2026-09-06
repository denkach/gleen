'use client';

import { useActionState } from 'react';

import {
  settingsErrorMessage,
  type SettingsClientCopy,
} from '@/lib/i18n/messages/settings';
import {
  setDisplayName,
  type DisplayNameActionState,
} from '@/lib/settings/actions';

import { SettingsPanel, SettingsSaveIcon } from './settings-panel';

const initialState: DisplayNameActionState = { status: 'idle' };

type ProfileSettingsProps = Readonly<{
  copy: SettingsClientCopy;
  displayName: string;
  email: string;
  emailVerified: boolean;
  initials: string;
}>;

export function ProfileSettings(props: ProfileSettingsProps) {
  const [state, action, pending] = useActionState(setDisplayName, initialState);
  const value = state.status === 'idle' ? props.displayName : state.value;
  const error =
    state.status === 'error'
      ? settingsErrorMessage(props.copy, state.code)
      : '';

  return (
    <section
      className="profile-settings settings-page"
      aria-labelledby="profile-settings-title"
    >
      <div className="page-head settings-page-head">
        <div>
          <span className="eyebrow">{props.copy.page.title}</span>
          <h1 id="profile-settings-title">{props.copy.profile.title}</h1>
          <p>{props.copy.profile.description}</p>
        </div>
      </div>
      <div className="settings-panel-stack">
        <SettingsPanel
          description={props.copy.profile.description}
          icon="profile"
          title={props.copy.profile.nameForm}
        >
          <div className="settings-profile-identity">
            <span className="settings-profile-avatar" aria-hidden="true">
              {props.initials}
            </span>
            <div>
              <strong>{props.displayName}</strong>
              <span>{props.email}</span>
            </div>
          </div>
          <form
            action={action}
            className="settings-form"
            aria-label={props.copy.profile.nameForm}
          >
            <div className="settings-form-grid">
              <label className="settings-field">
                <span>{props.copy.profile.displayName}</span>
                <input
                  defaultValue={value}
                  maxLength={100}
                  name="displayName"
                />
              </label>
              <label className="settings-field">
                <span>{props.copy.profile.email}</span>
                <input
                  aria-label={props.copy.profile.email}
                  readOnly
                  value={props.email}
                />
                <small className="settings-field__hint">
                  {props.emailVerified
                    ? props.copy.profile.verified
                    : props.copy.profile.unverified}
                </small>
              </label>
            </div>
            <div className="settings-form-actions">
              <p aria-live="polite" role={error ? 'alert' : 'status'}>
                {error ||
                  (state.status === 'success' ? props.copy.language.saved : '')}
              </p>
              <button
                className="ui-button settings-primary-button"
                data-variant="primary"
                disabled={pending}
                type="submit"
              >
                <SettingsSaveIcon />
                <span>
                  {pending
                    ? props.copy.language.saving
                    : props.copy.profile.save}
                </span>
              </button>
            </div>
          </form>
        </SettingsPanel>
      </div>
    </section>
  );
}
