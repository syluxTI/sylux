import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'SYLUX — Software house, T.I e Tráfego Pago com IA',
    loadComponent: () => import('./pages/hub/hub').then((m) => m.Hub),
  },
  {
    path: 'orbit',
    title: 'SYLUX · Orbit — Orquestração de Inteligência',
    loadComponent: () => import('./pages/orbit/orbit').then((m) => m.Orbit),
  },
  {
    path: 'paper',
    title: 'SYLUX · Paper — O objeto da inteligência',
    loadComponent: () => import('./pages/paper/paper').then((m) => m.Paper),
  },
  {
    path: 'flux',
    title: 'SYLUX · Flux — A malha líquida',
    loadComponent: () => import('./pages/flux/flux').then((m) => m.Flux),
  },
  {
    path: 'grid',
    title: 'SYLUX · Grid — Console de orquestração',
    loadComponent: () => import('./pages/grid/grid').then((m) => m.Grid),
  },
  {
    path: 'echo',
    title: 'SYLUX · Echo — O eco da inteligência',
    loadComponent: () => import('./pages/echo/echo').then((m) => m.Echo),
  },
  {
    path: '**',
    title: 'SYLUX · 404 — Rota fora da malha',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
