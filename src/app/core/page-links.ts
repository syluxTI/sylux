export const PAGE_PATH = {
  hub: '/',
  orbit: '/orbit',
  paper: '/paper',
  flux: '/flux',
  grid: '/grid',
  echo: '/echo',
} as const;

export type PagePath = (typeof PAGE_PATH)[keyof typeof PAGE_PATH];
