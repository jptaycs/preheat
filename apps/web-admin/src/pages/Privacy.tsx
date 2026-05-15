import React from 'react'
import { theme } from '../theme'

const EFFECTIVE_DATE = 'May 15, 2026'

export default function Privacy() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.colors.bg,
        color: theme.colors.text,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <header
        style={{
          background: theme.colors.s1,
          borderBottom: `1px solid ${theme.colors.border}`,
          padding: '0 24px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: theme.fontSizes.lg,
            fontWeight: 800,
            color: theme.colors.blue,
            letterSpacing: '-0.3px',
          }}
        >
          AeroFluxPro
        </span>
        <span style={{ color: theme.colors.t3, fontSize: theme.fontSizes.sm }}>Privacy Policy</span>
      </header>

      <main
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '40px 24px 80px',
          lineHeight: 1.7,
        }}
      >
        <h1
          style={{
            fontSize: theme.fontSizes.xxl,
            fontWeight: 800,
            color: theme.colors.text,
            marginBottom: 8,
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ color: theme.colors.t2, fontSize: theme.fontSizes.sm, marginBottom: 40 }}>
          Effective: {EFFECTIVE_DATE}
        </p>

        <Section title="1. What We Collect">
          <p>
            When you register for AeroFluxPro, we collect your name, email address, pilot license
            number, and a hashed version of your password. When you use the preheat scheduling
            service we also collect your aircraft tail numbers and preheat request history.
          </p>
          <p style={{ marginTop: 12 }}>
            If you enable push notifications we store the Expo push token on your account. We do not
            collect your exact device location.
          </p>
        </Section>

        <Section title="2. How We Use It">
          <p>We use your information to:</p>
          <ul style={{ marginTop: 8, paddingLeft: 24 }}>
            <li>Schedule and manage aircraft preheat requests</li>
            <li>Send confirmation reminders and status notifications</li>
            <li>Allow dispatchers and mechanics to coordinate preheat operations</li>
            <li>Detect and prevent fraudulent or abusive use of the service</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            We do not sell your personal data to third parties, and we do not use it for
            advertising.
          </p>
        </Section>

        <Section title="3. Data Sharing">
          <p>
            Your name and aircraft tail numbers are visible to airport dispatchers and mechanics on
            duty at airports where your preheat request is active. Your email address and password
            hash are never shared outside our systems.
          </p>
          <p style={{ marginTop: 12 }}>
            We use the following third-party services that may process your data:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 24 }}>
            <li>
              <strong>Expo (Expo Application Services)</strong> — push notification delivery
            </li>
            <li>
              <strong>Sentry</strong> — error and crash reporting (no PII in error payloads)
            </li>
          </ul>
        </Section>

        <Section title="4. Data Retention">
          <p>
            Your account data is retained as long as your account is active. Preheat request history
            is retained for 90 days after the request date. You may request deletion of your account
            and all associated data at any time by emailing{' '}
            <a href="mailto:support@preheat.app" style={{ color: theme.colors.blue }}>
              support@preheat.app
            </a>
            .
          </p>
        </Section>

        <Section title="5. Security">
          <p>
            Passwords are stored as bcrypt hashes and are never accessible in plain text. All
            communication between the app and our servers uses HTTPS. Access tokens expire after 15
            minutes; refresh tokens expire after 30 days.
          </p>
        </Section>

        <Section title="6. Children">
          <p>
            AeroFluxPro is intended for licensed pilots and aviation personnel. We do not knowingly
            collect data from anyone under the age of 18.
          </p>
        </Section>

        <Section title="7. Changes to This Policy">
          <p>
            If we make material changes to this policy we will update the effective date above and,
            where required by law, notify you by email or in-app notification.
          </p>
        </Section>

        <Section title="8. Contact">
          <p>
            Questions or requests related to this policy may be sent to{' '}
            <a href="mailto:support@preheat.app" style={{ color: theme.colors.blue }}>
              support@preheat.app
            </a>
            .
          </p>
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: theme.fontSizes.lg,
          fontWeight: 700,
          color: theme.colors.text,
          marginBottom: 12,
        }}
      >
        {title}
      </h2>
      <div style={{ color: theme.colors.t2, fontSize: theme.fontSizes.sm }}>{children}</div>
    </section>
  )
}
