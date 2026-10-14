/**
 * Utilitário para geração e normalização de slugs legíveis
 */
export function generateSlug(text: string): string {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // substitui caracteres especiais por traço
    .replace(/^-+|-+$/g, ''); // remove traços no início e fim
}

/**
 * Retorna a URL pública completa de uma imagem no R2 ou URL externa
 */
export function getR2ImageUrl(imageUrl: string | null | undefined, r2PublicUrl: string = 'https://imagens.crazyart.com.br'): string {
  if (!imageUrl) return 'https://crazyart.com.br/icons/icon-512.svg';
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const base = (r2PublicUrl || 'https://imagens.crazyart.com.br').replace(/\/+$/, '');
  const path = trimmed.replace(/^\/+/, '');
  return `${base}/${path}`;
}
