# Auth emails

The emails Supabase Auth sends, in Zelfora's style. The repo is the source of truth: after a change, paste the file into the Supabase dashboard under **Authentication → Emails → Templates**.

| File | Template | Subject |
| --- | --- | --- |
| `confirm_signup.html` | Confirm signup | see below |
| `reset_password.html` | Reset password | see below |

Subjects (paste as one line):

```
{{ $lang := or .Data.lang "nl" }}{{ if eq $lang "en" }}Confirm your email address for Zelfora{{ else if eq $lang "de" }}Bestätige deine E-Mail-Adresse für Zelfora{{ else }}Bevestig je e-mailadres voor Zelfora{{ end }}
```

```
{{ $lang := or .Data.lang "nl" }}{{ if eq $lang "en" }}Reset your Zelfora password{{ else if eq $lang "de" }}Setze dein Zelfora-Passwort zurück{{ else }}Herstel je wachtwoord voor Zelfora{{ end }}
```

- **Language:** `signUp` in `AuthContext` stores the site's language as `lang` in the user's metadata, and the templates read it as `.Data.lang`. Accounts without it (Google sign-ins, accounts from before) get Dutch. `or` supplies the default, so `eq` never compares a missing value.
- The other templates (magic link, invite, change email, reauthentication) aren't used by the site and keep Supabase's text.
- Test a change with a fresh sign-up and a password reset: a template error stops the email from being sent.
