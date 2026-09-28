import type { Profile, ResumeMeta } from '../types/profile';

export interface CompletionItem {
  key: string;
  label: string;
  /** Priority fields count double towards the percentage. */
  weight: number;
  done: boolean;
}

export interface Completion {
  percent: number;
  completed: number;
  total: number;
  items: CompletionItem[];
}

const filled = (value: string) => value.trim().length > 0;

export function computeCompletion(profile: Profile, resume: ResumeMeta | null): Completion {
  const { personal, professional, skills, links, education, preferences, answers } = profile;
  const hasName = (filled(personal.firstName) && filled(personal.lastName)) || filled(personal.fullName);

  const items: CompletionItem[] = [
    { key: 'name', label: 'Name', weight: 2, done: hasName },
    { key: 'email', label: 'Email', weight: 2, done: filled(personal.email) },
    { key: 'phone', label: 'Phone', weight: 2, done: filled(personal.phone) },
    { key: 'totalExperience', label: 'Total experience', weight: 2, done: filled(professional.totalExperience) },
    { key: 'skills', label: 'Skills', weight: 2, done: skills.primarySkills.length > 0 },
    { key: 'linkedin', label: 'LinkedIn', weight: 2, done: filled(links.linkedin) },
    { key: 'github', label: 'GitHub', weight: 2, done: filled(links.github) },
    { key: 'resume', label: 'Resume', weight: 2, done: resume !== null },
    { key: 'city', label: 'City', weight: 1, done: filled(personal.city) },
    { key: 'state', label: 'State', weight: 1, done: filled(personal.state) },
    { key: 'country', label: 'Country', weight: 1, done: filled(personal.country) },
    { key: 'pincode', label: 'Postal code', weight: 1, done: filled(personal.pincode) },
    { key: 'currentCompany', label: 'Current company', weight: 1, done: filled(professional.currentCompany) },
    { key: 'currentTitle', label: 'Current title', weight: 1, done: filled(professional.currentTitle) },
    { key: 'noticePeriod', label: 'Notice period', weight: 1, done: filled(professional.noticePeriod) },
    { key: 'degree', label: 'Degree', weight: 1, done: filled(education.degree) },
    { key: 'university', label: 'University', weight: 1, done: filled(education.university) },
    { key: 'graduationYear', label: 'Graduation year', weight: 1, done: filled(education.graduationYear) },
    { key: 'preferredRole', label: 'Preferred role', weight: 1, done: filled(preferences.preferredRole) },
    { key: 'workAuthorization', label: 'Work authorization', weight: 1, done: answers.workAuthorization !== '' },
    { key: 'requiresSponsorship', label: 'Sponsorship', weight: 1, done: answers.requiresSponsorship !== '' },
    { key: 'willingToRelocate', label: 'Relocation', weight: 1, done: answers.willingToRelocate !== '' },
  ];

  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const doneWeight = items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0);
  return {
    percent: Math.round((doneWeight / totalWeight) * 100),
    completed: items.filter((i) => i.done).length,
    total: items.length,
    items,
  };
}
