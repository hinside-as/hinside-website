const images = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/media/**/*.{png,jpg,jpeg,webp,avif}",
  { eager: true },
);

export function getMediaImage(path: string): ImageMetadata {
  const key = `/src/assets/media/${path}`;
  const mod = images[key];
  if (!mod) {
    throw new Error(
      `Media asset not found at src/assets/media/${path}. Checked keys: ${Object.keys(images).join(", ")}`,
    );
  }
  return mod.default;
}
