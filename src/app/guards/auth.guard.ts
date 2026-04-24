import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { NavController } from '@ionic/angular';

// Função auxiliar para decodificar o token
function decodeToken(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

// protecao para evitar que ao somente digitar admin-panel, o usuário comum consiga acessar a página de admin
// ✅ Guard para qualquer usuário logado (perfil ou outras páginas autenticadas)
export const authGuard: CanActivateFn = () => {
  const navCtrl = inject(NavController);
  const token = localStorage.getItem('token');

  if (!token) {
    navCtrl.navigateRoot('/login');
    return false;
  }

  const payload = decodeToken(token);

  if (!payload) {
    localStorage.removeItem('token');
    navCtrl.navigateRoot('/login');
    return false;
  }

  // Verifica se o token expirou
  const agora = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < agora) {
    localStorage.removeItem('token');
    navCtrl.navigateRoot('/login');
    return false;
  }

  return true;
};

// ✅ Guard exclusivo para admin
export const adminGuard: CanActivateFn = () => {
  const navCtrl = inject(NavController);
  const token = localStorage.getItem('token');

  if (!token) {
    navCtrl.navigateRoot('/login');
    return false;
  }

  const payload = decodeToken(token);

  if (!payload) {
    localStorage.removeItem('token');
    navCtrl.navigateRoot('/login');
    return false;
  }

  // Verifica expiração
  const agora = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < agora) {
    localStorage.removeItem('token');
    navCtrl.navigateRoot('/login');
    return false;
  }

  // Verifica se é admin
  if (payload.perfil?.toLowerCase() !== 'admin') {
    navCtrl.navigateRoot('/perfil'); // ← manda usuário comum para o perfil dele
    return false;
  }

  return true;
};