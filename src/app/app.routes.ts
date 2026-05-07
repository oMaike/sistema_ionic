import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth.guard'; // ← importe os guards

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login', // ← redireciona para login por padrão
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./Login/Login.page').then(m => m.LoginPage),
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
    canActivate: [authGuard], // ← protegida
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil.page').then(m => m.PerfilPage),
    canActivate: [authGuard], // ← protegida (qualquer usuário logado)
  },
  {
    path: 'admin-panel',
    loadComponent: () => import('./pages/admin-panel/admin-panel.page').then(m => m.AdminPanelPage),
    canActivate: [adminGuard], // ← protegida (só admin)
  },
  {
    path: 'admin-permissoes',
    loadComponent: () => import('./pages/admin-permissoes/admin-permissoes.page').then(m => m.AdminPermissoesPage),
    canActivate: [adminGuard],
  },
  {
    path: 'cadastro',
    loadComponent: () => import('./pages/cadastro/cadastro.page').then(m => m.CadastroPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage),
  },
  {
    path: 'tela3',
    loadComponent: () => import('./tela3/tela3.page').then(m => m.Tela3Page),
    canActivate: [authGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password/reset-password.page').then( m => m.ResetPasswordPage)
  },
];
