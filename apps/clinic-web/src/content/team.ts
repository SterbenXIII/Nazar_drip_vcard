import type { ImageMetadata } from 'astro'

import ivanPhoto from '../assets/team/team-1.jpg'
import marianaPhoto from '../assets/team/team-2.jpg'
import oleksiiPhoto from '../assets/team/team-3.jpg'
import stanislavPhoto from '../assets/team/team-4.jpg'
import nazarPhoto from '../assets/team/team-5.jpg'
import anastasiiaPhoto from '../assets/team/team-6.jpg'

export type TeamMember = {
  id: string
  name: string
  role: string
  experience: string
  description: string
  photo: ImageMetadata
  photoAlt: string
  photoPosition: string
  photoScale: number
}

export const teamMembers: TeamMember[] = [
  {
    id: 'ivan',
    name: 'Лисович Іван Васильович',
    role: 'Консультант із хімічних залежностей',
    experience: 'Досвід — уточнюється',
    description:
      'Підтримує людей на шляху до змін, допомагає розуміти особливості одужання та формувати практичні навички для стабільного відновлення.',
    photo: ivanPhoto,
    photoAlt: 'Портрет: Лисович Іван Васильович',
    photoPosition: '50% 32%',
    photoScale: 1.04,
  },
  {
    id: 'mariana',
    name: 'Федорчук Мар’яна Сергіївна',
    role: 'Психотерапевт з узалежнення',
    experience: 'Досвід — уточнюється',
    description:
      'Допомагає досліджувати причини узалежнення, працювати з емоційними труднощами та розвивати здорові способи подолання життєвих викликів.',
    photo: marianaPhoto,
    photoAlt: 'Портрет: Федорчук Мар’яна Сергіївна',
    photoPosition: '50% 38%',
    photoScale: 1,
  },
  {
    id: 'oleksii',
    name: 'Садовський Олексій Володимирович',
    role: 'Консультант із хімічних залежностей',
    experience: 'Досвід — уточнюється',
    description:
      'Супроводжує процес відновлення, підтримує формування нових навичок і допомагає працювати над стійкими змінами.',
    photo: oleksiiPhoto,
    photoAlt: 'Портрет: Садовський Олексій Володимирович',
    photoPosition: '50% 32%',
    photoScale: 1.02,
  },
  {
    id: 'stanislav',
    name: 'Антошків Станіслав Михайлович',
    role: 'Керівник центру · психолог · майстер НЛП',
    experience: 'Досвід — уточнюється',
    description:
      'Координує роботу команди та психологічний напрям допомоги, підтримуючи індивідуальний і комплексний підхід до відновлення.',
    photo: stanislavPhoto,
    photoAlt: 'Портрет: Антошків Станіслав Михайлович',
    photoPosition: '50% 28%',
    photoScale: 1.04,
  },
  {
    id: 'anastasiia',
    name: 'Мацеха Анастасія Вадимівна',
    role: 'Психологиня · арттерапевт',
    experience: 'Досвід — уточнюється',
    description:
      'Допомагає краще розуміти емоції, знаходити внутрішні ресурси та використовувати творчі методи для самовираження й відновлення.',
    photo: anastasiiaPhoto,
    photoAlt: 'Портрет: Мацеха Анастасія Вадимівна',
    photoPosition: '50% 30%',
    photoScale: 1.02,
  },
  {
    id: 'nazar',
    name: 'Якимець Назар Андрійович',
    role: 'Консультант із хімічних залежностей',
    experience: 'Досвід — уточнюється',
    description:
      'Підтримує на шляху до змін, допомагає визначати цілі відновлення та розвивати навички, необхідні для повсякденного життя.',
    photo: nazarPhoto,
    photoAlt: 'Портрет: Якимець Назар Андрійович',
    photoPosition: '50% 29%',
    photoScale: 1.16,
  },
]
