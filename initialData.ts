
import { AcademicTask } from './types';

export const INITIAL_TASKS: AcademicTask[] = [
  {
    id: '1',
    title: 'Modular Persistence in an Ink Recipe Tradition for Writing on Eggshells',
    type: 'Article',
    priority: 'High',
    status: 'Revision',
    description: 'Complete draft, in revision.'
  },
  {
    id: '2',
    title: 'A New Method for Identifying Ancient Stacte',
    type: 'Article',
    priority: 'Medium',
    status: 'Experimental',
    description: 'Multi-authored, experimental work done.',
    coAuthors: 'Multiple'
  },
  {
    id: '3',
    title: 'Aetius of Amida',
    type: 'Article',
    priority: 'Medium',
    status: 'Draft',
    description: 'For large edited work on Byzantine medicine, single author chapter.'
  },
  {
    id: '4',
    title: 'Aristotle on the Separation of Males and Females',
    type: 'Article',
    priority: 'High',
    status: 'Needs Update',
    description: 'High impact potential, needs significant updating and revision.'
  },
  {
    id: '5',
    title: 'Aristotle\'s On Drunkenness',
    type: 'Article',
    priority: 'Low',
    status: 'Draft',
    description: 'Co-authored, in draft.',
    coAuthors: 'TBD'
  },
  {
    id: '6',
    title: 'Athenaeus the Aristotelian',
    type: 'Article',
    priority: 'Medium',
    status: 'Revision',
    description: 'Singled authored, festschrift, near complete, in revision.'
  },
  {
    id: '7',
    title: 'The Fragrance of Places We Have Not Known',
    type: 'Article',
    priority: 'Medium',
    status: 'Revision',
    description: 'On Francois Coty and reception of ancient Greek perfumery by fascists. Edited volume, final revisions.'
  },
  {
    id: '8',
    title: 'Democritus\' Party Tricks: On the translation of some terms in Democritus\' paignia',
    type: 'Article',
    priority: 'High',
    status: 'Experimental',
    description: 'Note for Classical Quarterly using experimental replication.'
  },
  {
    id: '9',
    title: 'Athenaeus of Attalia: Complete Fragments',
    type: 'Book',
    priority: 'High',
    status: 'Draft',
    description: 'Major monograph, draft of fragments and translation, commentary needs huge work.'
  },
  {
    id: '10',
    title: 'A Subtler Alchemy: A Study of Technical Change in Greek and Roman Perfumery',
    type: 'Book',
    priority: 'High',
    status: 'Draft',
    description: 'Technical change 500 BCE to 1000 CE.'
  },
  {
    id: '11',
    title: 'Michael of Ephesus On Aristotle\'s Generation of Animals I-II',
    type: 'Translation',
    priority: 'High',
    status: 'Draft',
    description: 'Sorabji Series, draft translation, needs commentary.'
  },
  {
    id: '12',
    title: 'Michael of Ephesus: Philosopher and Commentator',
    type: 'Edited Volume',
    priority: 'High',
    status: 'Draft',
    description: 'Needs introduction and to be sent to Brill before Xmas.',
    deadline: '2024-12-24'
  },
  {
    id: '13',
    title: 'Ager, The scent of ancient magic',
    type: 'Book Review',
    priority: 'High',
    status: 'Draft',
    description: 'In draft, needs done by end of week!',
    deadline: '2024-11-22'
  },
  {
    id: '14',
    title: 'Ancient Perfumery Cookbook',
    type: 'Digital Humanities',
    priority: 'High',
    status: 'Experimental',
    description: 'Relational database for experimental replication, ~200 recipes.'
  },
  {
    id: '15',
    title: 'A History in Five Perfumes: The Ancient World in Scent',
    type: 'Book Proposal',
    priority: 'High',
    status: 'Draft',
    description: 'Framing via myrrh, cinnamon, galbanum, lily, kyphi. Aiming for Thames & Hudson / Getty.'
  },
  {
    id: '16',
    title: 'Metaphor in Aristotle\'s Natural Science',
    type: 'Article',
    priority: 'High',
    status: 'Needs Update',
    description: 'For Studium Estonica, full draft, needs update (10+ years old).'
  },
  {
    id: '17',
    title: 'Nenib List: A synoptic reading of ancient egyptian ritual ingredients',
    type: 'Article',
    priority: 'Low',
    status: 'Published',
    description: 'Published work.'
  },
  {
    id: '18',
    title: 'Alchemies of Scent',
    type: 'Grant',
    priority: 'High',
    status: 'Published',
    description: '5-year GACR grant, 800k EUR. Active through June 2026.',
    deadline: '2026-06-30'
  }
];
