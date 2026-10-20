import { useState, type FormEvent } from "react";

type Labels = {
  name: string;
  email: string;
  message: string;
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
        <input type="text" name="name" autoComplete="name" required />
      </label>
      <label>
        <span>{labels.email}</span>
        <input type="email" name="email" autoComplete="email" required />
      </label>
      <label>
        <span>{labels.message}</span>
        <textarea
          name="message"
          rows={1}
          required
          onInput={(event) => {
            // Starts as one line like the other fields and grows with the text.
            const field = event.currentTarget;
            field.style.height = "auto";
            field.style.height = `${field.scrollHeight}px`;
          }}
        />
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
          width: 100%;
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
        /* Underline-only fields: the label sits above, the field is just a
           hairline, so the form reads as lines on the page rather than
           boxes. */
        .contact-form input,
        .contact-form textarea {
          font: inherit;
          color: var(--color-fg);
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--color-border-strong);
          border-radius: 0;
          padding: var(--space-2) 0;
          line-height: var(--leading-normal);
          resize: none;
          overflow: hidden;
          display: block;
          transition: border-color var(--duration-base) var(--ease-standard);
        }
        .contact-form input:hover,
        .contact-form textarea:hover {
          border-bottom-color: var(--color-fg-muted);
        }
        .contact-form input:focus,
        .contact-form textarea:focus {
          outline: none;
          border-bottom-color: var(--color-fg);
        }
        .contact-form button {
          font: inherit;
          font-weight: var(--weight-thin);
          background: var(--color-fg);
          color: var(--color-bg);
          border: none;
          align-self: flex-start;
          font-size: var(--text-sm);
          padding: var(--space-2) var(--space-4);
          margin-top: var(--space-5);
          cursor: pointer;
          opacity: 0.85;
          position: relative;
          isolation: isolate;
          overflow: hidden;
          transition:
            opacity var(--duration-base) var(--ease-standard),
            color 700ms var(--ease-standard);
        }
        .contact-form button:hover {
          opacity: 1;
        }
        /* Hover: a smooth, continuous run of the site's colour spectrum
           (the typewriter reveal, the nav trail) fades in behind the label
           and slowly scrolls sideways. The gradient repeats end to start
           so the scroll loops with no seam. Desktop pointers only. */
        .contact-form button::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          opacity: 0;
          background: linear-gradient(
            90deg,
            hsl(50, 100%, 60%),
            hsl(30, 100%, 60%),
            hsl(350, 100%, 65%),
            hsl(270, 90%, 68%),
            hsl(195, 100%, 55%),
            hsl(120, 70%, 50%),
            hsl(50, 100%, 60%)
          );
          /* One tile is far wider than the button, so only a slow, long
             stretch of the spectrum shows at a time. */
          background-size: 900px 100%;
          transition: opacity 900ms var(--ease-standard);
        }
        @keyframes contact-spectrum-scroll {
          to { background-position-x: -900px; }
        }
        @media (hover: hover) {
          .contact-form button:not(:disabled):hover {
            color: var(--color-fg);
          }
          .contact-form button:not(:disabled):hover::before {
            opacity: 1;
          }
        }
        /* Always attached but paused at rest, so the position holds while
           the gradient fades back out instead of snapping. */
        @media (hover: hover) and (prefers-reduced-motion: no-preference) {
          .contact-form button::before {
            animation: contact-spectrum-scroll 14s linear infinite paused;
          }
          .contact-form button:not(:disabled):hover::before {
            animation-play-state: running;
          }
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
