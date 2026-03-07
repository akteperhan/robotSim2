export const PEDAGOGICAL_ERRORS: Record<string, { message: string; hint: string }> = {
  'wall_ahead': {
    message: 'Robotun önünde bir duvar var!',
    hint: 'Etrafından dolaşmayı dene. Sola veya sağa dönüp farklı bir yol bulabilirsin.'
  },
  'wall_behind': {
    message: 'Robotun arkasında bir engel var!',
    hint: 'Yönünü değiştirip başka bir rota dene.'
  },
  'no_button_nearby': {
    message: 'Yakınlarda basılacak bir buton yok!',
    hint: 'Butona basabilmek için önce yanına gitmen gerekiyor. Haritada sarı parlayan noktayı bul.'
  },
  'no_charging_pad': {
    message: 'Şarj istasyonunun üzerinde değilsin!',
    hint: 'Şarj olmak için yeşil parlayan şarj alanının tam üzerine git.'
  },
  'battery_dead': {
    message: 'Robotun enerjisi bitti!',
    hint: 'Daha kısa bir rota planlayarak enerji tasarrufu yapabilirsin. Gereksiz dönüşlerden kaçın.'
  },
  'already_pressed': {
    message: 'Bu buton zaten basılmış!',
    hint: 'Her buton sadece bir kez basılabilir. Bir sonraki hedefe ilerle.'
  },
  'command_failed': {
    message: 'Komut çalıştırılamadı.',
    hint: 'Robotun bulunduğu konumu ve yönünü kontrol et. Adımlarını tekrar gözden geçir.'
  }
}

export function getErrorMessage(errorType: string): string {
  const entry = PEDAGOGICAL_ERRORS[errorType]
  if (!entry) return PEDAGOGICAL_ERRORS['command_failed'].message
  return entry.message
}

export function getErrorHint(errorType: string): string {
  const entry = PEDAGOGICAL_ERRORS[errorType]
  if (!entry) return PEDAGOGICAL_ERRORS['command_failed'].hint
  return entry.hint
}

export function getFullErrorMessage(errorType: string): string {
  const entry = PEDAGOGICAL_ERRORS[errorType] || PEDAGOGICAL_ERRORS['command_failed']
  return `${entry.message}\n💡 ${entry.hint}`
}
