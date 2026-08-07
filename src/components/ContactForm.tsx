import { useState, type FormEvent } from "react";

type Labels = {
  name: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  subject: string;
  subjectPlaceholder: string;
  message: string;
  messagePlaceholder: string;
  submit: string;
  note: string;
  success: string;
  error: string;
};

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm({ labels }: { labels: Labels }) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    // Honeypot: real visitors never fill this hidden field.
    if (data.company) {
      setStatus("success");
      form.reset();
      return;
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Request failed");
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return <p className="contact-form__status">{labels.success}</p>;
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <label className="contact-form__honeypot" aria-hidden="true">
        <span>Company</span>
        <input type="text" name="company" tabIndex={-1} autoComplete="off" />
      </label>
      <label>
        <span>{labels.name}</span>
        <input type="text" name="name" placeholder={labels.namePlaceholder} required />
      </label>
      <label>
        <span>{labels.email}</span>
        <input type="email" name="email" placeholder={labels.emailPlaceholder} required />
      </label>
      <label>
        <span>{labels.subject}</span>
        <input type="text" name="subject" placeholder={labels.subjectPlaceholder} required />
      </label>
      <label>
        <span>{labels.message}</span>
        <textarea name="message" placeholder={labels.messagePlaceholder} rows={5} required />
      </label>

      <button type="submit" disabled={status === "submitting"}>
        {labels.submit}
      </button>

      {status === "error" ? (
        <p className="contact-form__status contact-form__status--error">
          {labels.error} <a href="mailto:hei@hinside.as">hei@hinside.as</a>
        </p>
      ) : (
        <p className="contact-form__note">{labels.note}</p>
      )}

      <style>{`
        .contact-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          max-width: 32rem;
          margin-inline: auto;
        }
        .contact-form__honeypot {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
        }
        .contact-form label {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          font-size: var(--text-sm);
          color: var(--color-fg-muted);
        }
        .contact-form input,
        .contact-form textarea {
          font: inherit;
          color: var(--color-fg);
          background: var(--color-bg-raised);
          border: 1px solid var(--color-border);
          padding: var(--space-3);
          resize: vertical;
        }
        .contact-form input:focus,
        .contact-form textarea:focus {
          outline: none;
          border-color: var(--color-fg-muted);
        }
        .contact-form button {
          font: inherit;
          font-weight: var(--weight-thin);
          background: var(--color-fg);
          color: var(--color-bg);
          border: none;
          padding: var(--space-3) var(--space-4);
          cursor: pointer;
          transition: opacity var(--duration-fast) var(--ease-standard);
        }
        .contact-form button:hover {
          opacity: 0.85;
        }
        .contact-form button:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .contact-form__note,
        .contact-form__status {
          font-size: var(--text-xs);
          color: var(--color-fg-muted);
        }
        .contact-form__status--error a {
          color: var(--color-fg);
          text-decoration: underline;
        }
      `}</style>
    </form>
  );
}
