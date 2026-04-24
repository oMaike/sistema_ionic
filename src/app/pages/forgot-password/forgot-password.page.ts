import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule]
})
export class ForgotPasswordPage {
  email: string = '';

  constructor(
    private http: HttpClient,
    private toastCtrl: ToastController
  ) {}

  enviar() {
    if (!this.email) {
      this.exibirToast('Por favor, digite seu e-mail.');
      return;
    }

    // Faz o POST para o seu user.js no backend
    this.http.post('http://localhost:9090/user/forgotPassword', { email: this.email })
      .subscribe({
        next: () => this.exibirToast('Link enviado! Verifique sua caixa de entrada.'),
        error: () => this.exibirToast('Erro ao processar solicitação.')
      });
  }

  async exibirToast(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }
}