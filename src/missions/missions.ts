import { MissionDefinition } from './MissionDefinition'

export const MISSIONS: MissionDefinition[] = [
  // ═══════════════════════════════════════════
  // CHAPTER 1: GARAJ TEMELLERİ
  // ═══════════════════════════════════════════
  {
    id: 'ch1-01',
    chapter: 1,
    chapterName: 'Garaj Temelleri',
    title: 'İlk Adımlar',
    description: 'Robotu 3 adım ileri götür.',
    hint: '"İleri Git" bloğunu kullan ve adım sayısını 3 yap.',
    optimalCommands: 1,
    winCondition: { type: 'reach_position', targetPosition: { x: 5, y: 6 } },
    availableBlocks: ['move_forward'],
    doorStartsOpen: false
  },
  {
    id: 'ch1-02',
    chapter: 1,
    chapterName: 'Garaj Temelleri',
    title: 'Dönüş Zamanı',
    description: 'Robotu sola döndür ve 3 adım ilerle.',
    hint: 'Önce "Sola Dön" bloğunu, sonra "İleri Git" bloğunu kullan.',
    optimalCommands: 2,
    winCondition: { type: 'reach_position', targetPosition: { x: 2, y: 3 } },
    availableBlocks: ['move_forward', 'turn_left', 'turn_right'],
    doorStartsOpen: false
  },
  {
    id: 'ch1-03',
    chapter: 1,
    chapterName: 'Garaj Temelleri',
    title: 'Tarayıcıya Ulaş',
    description: 'Robotu duvardaki mavi tarayıcı paneline kadar sür.',
    hint: 'İleri git, sola dön, sonra tekrar ileri git. Tarayıcı (0,7) konumunda.',
    optimalCommands: 3,
    winCondition: { type: 'reach_position', targetPosition: { x: 0, y: 7 } },
    availableBlocks: ['move_forward', 'turn_left', 'turn_right'],
    doorStartsOpen: false
  },
  {
    id: 'ch1-04',
    chapter: 1,
    chapterName: 'Garaj Temelleri',
    title: 'Kapıyı Aç',
    description: 'Tarayıcı paneline git ve butona basarak garaj kapısını aç.',
    hint: 'Tarayıcıya ulaştıktan sonra "Butona Bas" bloğunu ekle.',
    optimalCommands: 4,
    winCondition: { type: 'open_door' },
    availableBlocks: ['move_forward', 'turn_left', 'turn_right', 'press_button'],
    doorStartsOpen: false
  },
  {
    id: 'ch1-05',
    chapter: 1,
    chapterName: 'Garaj Temelleri',
    title: 'Şarj İstasyonu',
    description: 'Kapıyı aç, dışarı çık ve şarj istasyonuna ulaşarak şarj ol.',
    hint: 'Butona bastıktan sonra kapıdan çık, sağa dön, ilerle ve şarj bloğunu kullan.',
    optimalCommands: 9,
    winCondition: { type: 'charge_full' },
    availableBlocks: null,
    doorStartsOpen: false
  },
  // ═══════════════════════════════════════════
  // CHAPTER 2: DÖNGÜLER
  // ═══════════════════════════════════════════
  {
    id: 'ch2-01',
    chapter: 2,
    chapterName: 'Döngüler',
    title: 'Tekrar Tekrar',
    description: 'Döngü kullanarak robotu 6 adım ilerlet.',
    hint: '"Tekrarla" bloğunun içine "İleri Git" bloğunu koy ve tekrar sayısını ayarla.',
    optimalCommands: 1,
    winCondition: { type: 'reach_position', targetPosition: { x: 5, y: 9 } },
    availableBlocks: ['move_forward', 'turn_left', 'turn_right', 'repeat_times'],
    doorStartsOpen: true
  },
  {
    id: 'ch2-02',
    chapter: 2,
    chapterName: 'Döngüler',
    title: 'Kare Çiz',
    description: 'Döngü ile kare hareketi yap: ileri git, sağa dön — 4 kez tekrarla.',
    hint: '"Tekrarla 4 kez" içine "İleri Git" ve "Sağa Dön" koy.',
    optimalCommands: 1,
    winCondition: { type: 'reach_position', targetPosition: { x: 5, y: 3 } },
    availableBlocks: ['move_forward', 'turn_left', 'turn_right', 'repeat_times'],
    doorStartsOpen: false
  },
  {
    id: 'ch2-03',
    chapter: 2,
    chapterName: 'Döngüler',
    title: 'Zigzag',
    description: 'Döngü kullanarak zigzag hareketi yap.',
    hint: 'İleri git, sola dön, ileri git, sağa dön — bunu tekrarla.',
    optimalCommands: 1,
    winCondition: { type: 'reach_position', targetPosition: { x: 3, y: 7 } },
    availableBlocks: ['move_forward', 'turn_left', 'turn_right', 'repeat_times'],
    doorStartsOpen: false
  },
  {
    id: 'ch2-04',
    chapter: 2,
    chapterName: 'Döngüler',
    title: 'Uzun Koridor',
    description: 'Döngü ile kapıya kadar git ve kapıyı aç.',
    hint: 'Döngü ile uzun mesafeyi kat et, sonra butona bas.',
    optimalCommands: 4,
    winCondition: { type: 'open_door' },
    availableBlocks: ['move_forward', 'turn_left', 'turn_right', 'press_button', 'repeat_times'],
    doorStartsOpen: false
  },
  {
    id: 'ch2-05',
    chapter: 2,
    chapterName: 'Döngüler',
    title: 'Tam Tur',
    description: 'Döngülerle kapıyı aç ve şarj istasyonuna ulaş.',
    hint: 'İlk görevlerdeki bilgini birleştir ve döngülerle daha verimli yaz.',
    optimalCommands: 5,
    winCondition: { type: 'charge_full' },
    availableBlocks: null,
    doorStartsOpen: false
  }
]

export function getMissionById(id: string): MissionDefinition | undefined {
  return MISSIONS.find(m => m.id === id)
}

export function getMissionsByChapter(chapter: number): MissionDefinition[] {
  return MISSIONS.filter(m => m.chapter === chapter)
}

export function getChapterNames(): { chapter: number; name: string }[] {
  const seen = new Map<number, string>()
  MISSIONS.forEach(m => {
    if (!seen.has(m.chapter)) seen.set(m.chapter, m.chapterName)
  })
  return Array.from(seen, ([chapter, name]) => ({ chapter, name }))
}
