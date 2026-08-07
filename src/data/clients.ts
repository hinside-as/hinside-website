export type Client = {
  name: string;
  tagline: string;
  href: string;
  logo: string;
  /** Rendered logo height in rem — matches each mark's original logoHeight (px/16). */
  height: number;
};

export const clients: Client[] = [
  { name: "Nordic Light Festival", tagline: "Photo Festival", href: "https://www.nordiclightfestival.no/", logo: "/media/shared/client-logos/nordic-light.svg", height: 5 },
  { name: "Oslo Kommune", tagline: "Public Sector", href: "https://www.oslo.kommune.no/", logo: "/media/shared/client-logos/oslo-kommune.svg", height: 3.5 },
  { name: "Yara", tagline: "Industry", href: "https://www.yara.no/", logo: "/media/shared/client-logos/yara.svg", height: 4.5 },
  { name: "DIBK", tagline: "Regulation", href: "https://www.dibk.no/", logo: "/media/shared/client-logos/dibk.svg", height: 2.5 },
  { name: "Veidekke", tagline: "Construction", href: "https://www.veidekke.no/", logo: "/media/shared/client-logos/veidekke.svg", height: 1.5 },
  { name: "Innovasjon Norge", tagline: "Innovation", href: "https://www.innovasjonnorge.no/", logo: "/media/shared/client-logos/innovasjon-norge.svg", height: 3 },
  { name: "Hydro", tagline: "Materials", href: "https://www.hydro.com/", logo: "/media/shared/client-logos/hydro.svg", height: 5 },
  { name: "Storebrand", tagline: "Finance", href: "https://www.storebrand.no/", logo: "/media/shared/client-logos/storebrand.svg", height: 1.5 },
  { name: "DOGA", tagline: "Design", href: "https://www.doga.no/", logo: "/media/shared/client-logos/doga.svg", height: 4 },
  { name: "Ungdata", tagline: "Research", href: "https://www.ungdata.no/", logo: "/media/shared/client-logos/ungdata.svg", height: 2 },
  { name: "Eir", tagline: "Healthcare", href: "https://www.eir.no/", logo: "/media/shared/client-logos/eir.svg", height: 3 },
];
