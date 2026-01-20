
import { AcademicTask } from './types.ts';

export const INITIAL_TASKS: AcademicTask[] = [
  {
    id: '1',
    title: 'Aetius of Amida: Books 1-4 Translation',
    type: 'Translation',
    priority: 'High',
    status: 'Revision',
    description: 'Critical translation of medical encyclopedias from Late Antiquity. Currently focusing on the pharmacology sections in Book 2.',
    coAuthors: 'Sean Coughlin',
    deadline: '2025-06-15',
    isFavorite: true
  },
  {
    id: '2',
    title: 'Experimental Archaeology: Replicating Kyphi',
    type: 'Digital Humanities',
    priority: 'Medium',
    status: 'Experimental',
    description: 'Reconstruction of ancient Egyptian incense based on Temple of Edfu inscriptions. Analyzing resin ratios and burn temperatures.',
    deadline: '2025-08-20',
    isFavorite: false
  },
  {
    id: '3',
    title: 'The Stoic Theory of Pneuma in Medicine',
    type: 'Article',
    priority: 'High',
    status: 'Draft',
    description: 'Exploring the intersection of Stoic physics and early Galenic physiology. Target journal: Journal of Hellenic Studies.',
    deadline: '2025-04-10',
    isFavorite: true
  },
  {
    id: '4',
    title: 'Alchemies of Scent: Technical Volume',
    type: 'Book',
    priority: 'Aspirational',
    status: 'Upcoming',
    description: 'Comprehensive study of the technical history of perfumery in the ancient world.',
    deadline: '2026-12-01',
    isFavorite: false
  }
];
