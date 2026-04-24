import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { IonicModule, AlertController, NavController } from '@ionic/angular';

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

  private readonly API_URL = 'http://localhost:9090/user';

  constructor(
    private http: HttpClient,
    private alertController: AlertController,
    private navCtrl: NavController
  ) {}

  recuperarSenha() {
    this.navCtrl.navigateForward('/forgot-password');
  }

  irParaCadastro() {
    this.navCtrl.navigateForward('/cadastro');
  }

  fazerLogin() {
    if (!this.usuario.email || !this.usuario.senha) {
      this.exibirMensagem('Erro', 'Preencha todos os campos.');
      return;
    }

    this.http.post(`${this.API_URL}/login`, {
      email: this.usuario.email,
      senha: this.usuario.senha   // ✅ CORRIGIDO: era "password"
    }).subscribe({
      next: (res: any) => {
        console.log('✅ Resposta do login:', res); // DEBUG

        if (!res.token) {
          this.exibirMensagem('Erro', 'Token não recebido.');
          return;
        }

        localStorage.setItem('token', res.token);

        try {
          const base64Url = res.token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payloadToken = JSON.parse(window.atob(base64));

          //DEBUG: Exibir o conteúdo do token decodificado para verificar o perfil
          console.log('Token decodificado:', payloadToken); // DEBUG
          console.log(' Perfil:', payloadToken.perfil);      // DEBUG

          const perfil = payloadToken.perfil
            ? payloadToken.perfil.toLowerCase()
            : 'user1';

          if (perfil === 'admin') {
            this.navCtrl.navigateRoot('/admin-panel');
          } else {
            this.navCtrl.navigateRoot('/perfil');
          }

        } catch (error) {
          console.error('❌ Erro ao decodificar token:', error); // DEBUG
          this.navCtrl.navigateRoot('/perfil');
        }
      },
      error: (err) => {
        console.error('❌ Erro HTTP:', err.status, err.error); // DEBUG

        let mensagem = 'Erro ao conectar com o servidor.';
        if (err.status === 401) {
          mensagem = 'E-mail/Senha incorretos ou conta aguardando aprovação.';
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