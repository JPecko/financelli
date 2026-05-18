export function accountGradient(color: string): string {
  return `linear-gradient(135deg, color-mix(in srgb, ${color} 18%, #000000) 0%, ${color} 100%)`
}
