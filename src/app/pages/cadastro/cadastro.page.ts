import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, NavController, ToastController } from '@ionic/angular';

import { HttpClient, HttpClientModule } from '@angular/common/http';
import { addIcons } from 'ionicons';
import {
  personAddOutline, personOutline, mailOutline,
  lockClosedOutline, shieldCheckmarkOutline,
  checkmarkCircleOutline, informationCircleOutline,
  closeOutline
} from 'ionicons/icons';

// ── Interfaces ─────────────────────────────────────────────
interface NovoUsuario {
  nome: string;
  email: string;
  senha: string;
  perfil: string;
}

interface ForcaSenha {
  pct: number;
  nivel: 'fraca' | 'media' | 'forte' | 'otima';
  texto: string;
}

interface Erros {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
}

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.page.html',
  styleUrls: ['./cadastro.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule]
})
export class CadastroPage {

  novoUsuario: NovoUsuario = {
    nome: '',
    email: '',
    senha: '',
    perfil: 'user1'
  };

  confirmarSenha: string = '';
  carregando: boolean = false;

  erros: Erros = {
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  };

  forcaSenha: ForcaSenha = {
    pct: 0,
    nivel: 'fraca',
    texto: ''
  };

  private readonly API_URL = 'http://localhost:9090/user';

  constructor(
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) {
    addIcons({
      personAddOutline, personOutline, mailOutline,
      lockClosedOutline, shieldCheckmarkOutline,
      checkmarkCircleOutline, informationCircleOutline,
      closeOutline
    });
  }

  // ── Navegação ────────────────────────────────────────────
  irParaLogin() {
    this.navCtrl.navigateBack('/login');
  }

  // ── Validação por campo ──────────────────────────────────
  validarCampo(campo: keyof Erros) {
    switch (campo) {
      case 'nome':
        if (!this.novoUsuario.nome.trim()) {
          this.erros.nome = 'Nome é obrigatório.';
        } else if (this.novoUsuario.nome.trim().length < 3) {
          this.erros.nome = 'Nome deve ter pelo menos 3 caracteres.';
        } else {
          this.erros.nome = '';
        }
        break;

      case 'email':
        if (!this.novoUsuario.email) {
          this.erros.email = 'E-mail é obrigatório.';
        } else if (!this.isEmailValido(this.novoUsuario.email)) {
          this.erros.email = 'Informe um e-mail válido.';
        } else {
          this.erros.email = '';
        }
        break;

      case 'senha':
        if (!this.novoUsuario.senha) {
          this.erros.senha = 'Senha é obrigatória.';
        } else if (!this.isSenhaForte(this.novoUsuario.senha)) {
          this.erros.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
        } else {
          this.erros.senha = '';
        }
        this.calcularForcaSenha(this.novoUsuario.senha);

        // Re-valida confirmação se já foi preenchida
        if (this.confirmarSenha) {
          this.validarCampo('confirmarSenha');
        }
        break;

      case 'confirmarSenha':
        if (!this.confirmarSenha) {
          this.erros.confirmarSenha = 'Confirme sua senha.';
        } else if (this.confirmarSenha !== this.novoUsuario.senha) {
          this.erros.confirmarSenha = 'As senhas não coincidem.';
        } else {
          this.erros.confirmarSenha = '';
        }
        break;

    }
  }

  // ── Validação de todos os campos antes de enviar ─────────
  private validarTudo(): boolean {
    this.validarCampo('nome');
    this.validarCampo('email');
    this.validarCampo('senha');
    this.validarCampo('confirmarSenha');

    return !this.erros.nome && !this.erros.email &&
           !this.erros.senha && !this.erros.confirmarSenha;
  }

  // ── Força da senha ────────────────────────────────────────
  private calcularForcaSenha(senha: string) {
    if (!senha) {
      this.forcaSenha = { pct: 0, nivel: 'fraca', texto: '' };
      return;
    }

    let score = 0;
    if (senha.length >= 8)  score++;
    if (senha.length >= 10) score++;
    if (/[A-Z]/.test(senha)) score++;
    if (/[0-9]/.test(senha)) score++;
    if (/[^A-Za-z0-9]/.test(senha)) score++;

    const niveis: ForcaSenha[] = [
      { pct: 20,  nivel: 'fraca', texto: 'Fraca' },
      { pct: 40,  nivel: 'fraca', texto: 'Fraca' },
      { pct: 60,  nivel: 'media', texto: 'Média' },
      { pct: 80,  nivel: 'forte', texto: 'Forte' },
      { pct: 100, nivel: 'otima', texto: 'Ótima' },
    ];

    this.forcaSenha = niveis[Math.min(score, 4)];
  }

  // ── Validação de e-mail ───────────────────────────────────
  private isEmailValido(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isSenhaForte(senha: string): boolean {
    return senha.length >= 8 && /[A-Za-z]/.test(senha) && /[0-9]/.test(senha);
  }

  // ── Envio do formulário ───────────────────────────────────
  async cadastrar() {
    if (!this.validarTudo()) return;

    this.carregando = true;

    // Monta o payload sem expor confirmação de senha
    const payload = {
      nome:   this.novoUsuario.nome.trim(),
      email:  this.novoUsuario.email.toLowerCase().trim(),
      senha:  this.novoUsuario.senha,
      perfil: this.novoUsuario.perfil,
      geolocalizacaoConsentida: true,
      localizacao: null
    };

    this.http.post(`${this.API_URL}/signup`, payload).subscribe({
      next: async () => {
        this.carregando = false;
        const alert = await this.alertCtrl.create({
          header: 'Cadastro Realizado!',
          message: 'O queijo foi cadastrado. Aguarde a aprovacao do administrador para fazer login.',
          buttons: [{
            text: 'Ir para o Login',
            handler: () => this.navCtrl.navigateRoot('/login')
          }]
        });
        await alert.present();
      },
      error: (err) => {
        this.carregando = false;
        const msg = err.error?.message || 'Não foi possível criar sua conta. Tente novamente.';
        this.showToast(msg, 'danger');
      }
    });
  }

  // ── Toast de feedback ─────────────────────────────────────
  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
      buttons: [{ icon: 'close-outline', role: 'cancel' }]
    });
    await toast.present();
  }
}
