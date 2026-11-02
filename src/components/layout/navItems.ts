import { Briefcase, Compass, GraduationCap, History, LayoutDashboard, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/applications', label: 'Вакансии', icon: Briefcase },
  { to: '/market', label: 'Поиск вакансий', icon: Compass },
  { to: '/interview-coach', label: 'AI-тренажёр', icon: GraduationCap },
  { to: '/history', label: 'История', icon: History },
  { to: '/profile', label: 'Профиль', icon: User },
];
