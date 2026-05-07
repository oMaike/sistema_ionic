import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule]
})
export class ResetPasswordPage implements OnInit {
  token: string | null = null;
  newPassword: string = '';
  confirmPassword: string = '';
  isLoading: boolean = false;

  private readonly API_URL = 'http://localhost:9090/user';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    // Pega o token da URL que veio do e-mail
    this.token = this.route.snapshot.queryParamMap.get('token');
  }

  async salvarSenha() {
    if (!this.token) {
      this.exibirToast('Link de recuperação inválido.', 'danger');
      return;
    }

    if (this.newPassword.length < 6) {
      this.exibirToast('A senha deve ter no mínimo 6 caracteres.', 'warning');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.exibirToast('As senhas nÃ£o coincidem.', 'warning');
      return;
    }

    const payload = {
      token: this.token,
      newPassword: this.newPassword
    };

    this.isLoading = true;

    this.http.post(`${this.API_URL}/resetPassword`, payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.exibirToast('Senha alterada com sucesso!', 'success');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading = false;
        const erroMsg = err.error?.message || 'Erro ao redefinir senha.';
        this.exibirToast(erroMsg, 'danger');
      }
    });
  }

  async exibirToast(msg: string, cor: string) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 3000,
      color: cor,
      position: 'bottom'
    });
    toast.present();
  }
}
