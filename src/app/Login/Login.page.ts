import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { IonicModule, AlertController, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  keyOutline,
  lockClosedOutline,
  logInOutline,
  mailOutline,
  personAddOutline
} from 'ionicons/icons';
import { LocationTrackingService } from '../services/location-tracking.service';

@Component({
  selector: 'app-Login',
  templateUrl: './Login.page.html',
  styleUrls: ['./Login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule]
})
export class LoginPage {
  usuario = {
    email: '',
    senha: ''
  };
  isLoading = false;

  private readonly API_URL = 'http://localhost:9090/user';

  constructor(
    private http: HttpClient,
    private alertController: AlertController,
    private navCtrl: NavController,
    private locationTracking: LocationTrackingService
  ) {
    addIcons({
      keyOutline,
      lockClosedOutline,
      logInOutline,
      mailOutline,
      personAddOutline
    });
  }

  recuperarSenha() {
    this.navCtrl.navigateForward('/forgot-password');
  }

  irParaCadastro() {
    this.navCtrl.navigateForward('/cadastro');
  }

  fazerLogin() {
    if (this.isLoading) return;

    const email = this.usuario.email.trim().toLowerCase();
    const senha = this.usuario.senha;

    if (!email || !senha) {
      this.exibirMensagem('Erro', 'Preencha todos os campos.');
      return;
    }

    this.isLoading = true;

    this.http.post(`${this.API_URL}/login`, {
      email,
      senha
    }).subscribe({
      next: (res: any) => {
        if (!res.token) {
          this.isLoading = false;
          this.exibirMensagem('Erro', 'Token não recebido.');
          return;
        }

        localStorage.setItem('token', res.token);
        this.locationTracking.startTrackingFromToken(res.token);

        try {
          const base64Url = res.token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payloadToken = JSON.parse(window.atob(base64));

          const perfil = payloadToken.perfil
            ? payloadToken.perfil.toLowerCase()
            : 'user1';

          if (perfil === 'admin') {
            this.navCtrl.navigateRoot('/admin-panel').finally(() => {
              this.isLoading = false;
            });
          } else {
            this.navCtrl.navigateRoot('/perfil').finally(() => {
              this.isLoading = false;
            });
          }

        } catch (error) {
          this.navCtrl.navigateRoot('/perfil').finally(() => {
            this.isLoading = false;
          });
        }
      },
      error: (err) => {
        this.isLoading = false;

        let mensagem = err.error?.message || 'Erro ao conectar com o servidor.';
        if (err.status === 401) {
          mensagem = 'E-mail/Senha incorretos ou conta aguardando aprovação.';
        } else if (err.status === 403) {
          mensagem = err.error?.message || 'Conta indisponível. Aguarde aprovação ou fale com o administrador.';
        } else if (err.status === 400) {
          mensagem = err.error?.message || 'Informe um e-mail e senha válidos.';
        } else if (err.status === 0) {
          mensagem = 'Sem conexão com o servidor. Verifique se o backend está rodando.';
        }
        this.exibirMensagem('Falha no Login', mensagem);
      }
    });
  }

  async exibirMensagem(titulo: string, msg: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: msg,
      buttons: ['OK']
    });
    await alert.present();
  }
}
