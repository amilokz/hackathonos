/**
 * Converts any common YouTube URL shape into an embeddable
 * https://www.youtube.com/embed/<id> URL. Returns '' for anything
 * that does not look like a YouTube video link.
 *
 * Supported: watch?v=, youtu.be/, /embed/, /shorts/, /live/, /v/
 */
export function toYouTubeEmbed(input: string): string {
  if (!input) return '';
  const url = input.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?(?:[^#]*[?&])?v=|youtube\.com\/(?:embed|shorts|live|v)\/|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return '';
}
