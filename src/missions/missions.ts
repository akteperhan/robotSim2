import { MissionDefinition } from './MissionDefinition'

export const MISSIONS: MissionDefinition[] = [
  // ═══════════════════════════════════════════
  // CHAPTER 1: GARAJ TEMELLERİ (PDF Hikayesi)
  // ═══════════════════════════════════════════
  {
    id: 'ch1-01',
    chapter: 1,
    chapterName: 'Garaj Temelleri',
    title: 'Adım 1: Garaj Kapısını Aç',
    description: 'Robot garajın içinde kapalı. Kapının yanında duvarda kocaman, parlak SARI BİR BUTON var. Kapı kilitli. Robotu butona kadar sür.',
    hint: 'İleri git, sola dön ve tekrar ileri git.',
    optimalCommands: 3,
    winCondition: { type: 'reach_position', targetPosition: { x: 0, y: 7 } },
    availableBlocks: ['move_forward', 'turn_left', 'turn_right'],
    doorStartsOpen: false
  },
  {
    id: 'ch1-02',
    chapter: 1,
    chapterName: 'Garaj Temelleri',
    title: 'Adım 2: Sistemi Aktif Et',
    description: 'Robot butonun önüne geldi. Şimdi etkileşime girmeli. Butona basılmazsa kapı açılmaz. Robot butona basmalı.',
    hint: '"Butona Bas" bloğunu kullanarak garaj kapısını aç.',
    optimalCommands: 4,
    winCondition: { type: 'open_door' },
    availableBlocks: ['move_forward', 'turn_left', 'turn_right', 'press_button'],
    doorStartsOpen: false
  },
  {
    id: 'ch1-03',
    chapter: 1,
    chapterName: 'Garaj Temelleri',
    title: 'Adım 3: Enerjiye Ulaş',
    description: 'Pil bitmek üzere (%2... %1...). Kapı açıldı, dışarıda parlayan yeşil bir Şarj Alanı var. Açılan kapıdan geç ve tam üzerine park et.',
    hint: 'Butona bastıktan sonra dışarı çıkıp şarj alanına ulaş.',
    optimalCommands: 9,
    winCondition: { type: 'reach_position', targetPosition: { x: 2, y: 15 } }, // Charge pad position is 2, 15
    availableBlocks: ['move_forward', 'turn_left', 'turn_right', 'press_button'],
    doorStartsOpen: false
  },
  {
    id: 'ch1-04',
    chapter: 1,
    chapterName: 'Garaj Temelleri',
    title: 'Adım 4: Şarj Ol!',
    description: 'Şarj alanına ulaştın. Şarj bloğunu kullanarak bataryanı %100 yap! Pil göstergesi %100 olduğunda hazırsın!',
    hint: 'Şarj istasyonuna vardıktan sonra şarj işlemini tetikle.',
    optimalCommands: 9,
    winCondition: { type: 'charge_full' },
    availableBlocks: ['move_forward', 'turn_left', 'turn_right', 'press_button', 'charge'], // charge bloğunu bu aşamada veriyoruz
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
