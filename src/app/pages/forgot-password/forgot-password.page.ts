import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { logInOutline, mailOutline, sendOutline } from 'ionicons/icons';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule]
})
export class ForgotPasswordPage {
  email: string = '';
  erroEmail: string = '';
  carregando: boolean = false;

  constructor(
    private http: HttpClient,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) {
    addIcons({ logInOutline, mailOutline, sendOutline });
  }

  voltarLogin() {
    this.navCtrl.navigateBack('/login');
  }

  validarEmail(mostrarObrigatorio: boolean = false): boolean {
    const email = this.email.trim();

    if (!email) {
      this.erroEmail = mostrarObrigatorio ? 'Informe seu e-mail.' : '';
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.erroEmail = 'Informe um e-mail válido.';
      return false;
    }

    this.erroEmail = '';
    return true;
  }

  enviar() {
    if (this.carregando) return;

    if (!this.validarEmail(true)) {
      this.exibirToast('Por favor, digite seu e-mail.');
      return;
    }

    this.carregando = true;

    const payload = { email: this.email.trim().toLowerCase() };

    this.http.post('http://localhost:9090/user/forgotPassword', payload)
      .subscribe({
        next: () => {
          this.carregando = false;
          this.exibirToast('Link enviado! Verifique sua caixa de entrada.', 'success');
        },
        error: () => {
          this.carregando = false;
          this.exibirToast('Erro ao processar solicitação.', 'danger');
        }
      });
  }

  async exibirToast(msg: string, color: 'success' | 'danger' | 'warning' = 'warning') {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
