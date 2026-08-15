export const locales = ["no", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "no";

export const ui = {
  no: {
    "nav.work": "Arbeid",
    "nav.studio": "Studio",
    "nav.contact": "Kontakt",
    "nav.menu": "Meny",
    "nav.close": "Lukk",
    "lang.switchTo": "English",
    "home.hero.eyebrow":
      "Hinside er et designstudio som bygger tydelighet, stolthet og gjenkjennelse gjennom visuell problemløsning med presisjon og egenart.",
    "home.clients.intro":
      "Kompetansen i Hinside er bygget på erfaring fra tidligere designstudioer og bidrag til prosjekter for noen av Norges sterkeste merkevarer.",
    "form.email": "E-post",
    "form.emailPlaceholder": "E-postadressen din...",
    "form.message": "Melding",
    "form.messagePlaceholder": "Fortell meg mer (jeg er lutter øre)...",
    "form.submit": "Send melding",
    "form.note": "Meldinger sendes til hei@hinside.as",
    "form.success": "Takk! Meldingen er sendt — jeg svarer så snart jeg kan.",
    "form.error": "Noe gikk galt. Send meg heller en e-post direkte på",
    "case.client": "Kunde",
    "case.back": "Alle prosjekter",
    "case.hideText": "Skjul tekst",
    "case.showText": "Vis tekst",
    "case.recognition": "Anerkjennelse",
    "case.credits": "Kreditering",
    "case.creditsRole": "Rolle",
    "case.creditsName": "Navn",
    "cookies.message": "Vi bruker analyse for å forstå hvordan siden brukes. Ingenting lastes før du godtar.",
    "cookies.accept": "Godta",
    "cookies.decline": "Avslå",
  },
  en: {
    "nav.work": "Work",
    "nav.studio": "Studio",
    "nav.contact": "Contact",
    "nav.menu": "Menu",
    "nav.close": "Close",
    "lang.switchTo": "Norsk",
    "home.hero.eyebrow":
      "Hinside is a design studio building clarity, pride and recognition through visual problem-solving with precision and character.",
    "home.clients.intro":
      "The expertise within Hinside is built on experience from previous design studios and contributions to projects for some of Norway's strongest brands.",
    "form.email": "Email",
    "form.emailPlaceholder": "Your email address...",
    "form.message": "Message",
    "form.messagePlaceholder": "Tell me more (I'm all ears)...",
    "form.submit": "Send message",
    "form.note": "Messages will be sent to hei@hinside.as",
    "form.success": "Thanks! Your message is on its way — I'll reply as soon as I can.",
    "form.error": "Something went wrong. Email me directly instead at",
    "case.client": "Client",
    "case.back": "All projects",
    "case.hideText": "Hide text",
    "case.showText": "Show text",
    "case.recognition": "Recognition",
    "case.credits": "Credits",
    "case.creditsRole": "Role",
    "case.creditsName": "Name",
    "cookies.message": "We use analytics to understand how the site is used. Nothing loads until you accept.",
    "cookies.accept": "Accept",
    "cookies.decline": "Decline",
  },
} as const;

export type UiKey = keyof (typeof ui)["no"];
