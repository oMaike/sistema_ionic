import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, NavController, ToastController } from '@ionic/angular';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { addIcons } from 'ionicons';
import {
  logOutOutline, saveOutline, trashOutline,
  personOutline, mailOutline, lockClosedOutline,
  createOutline, shieldCheckmarkOutline, fingerPrintOutline,
  warningOutline, checkmarkCircleOutline, ellipse
} from 'ionicons/icons';

interface DadosUsuario {
  id: number | null;
  nome: string;
  email: string;
  perfil: string;
}

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule]
})
export class PerfilPage implements OnInit {

  dados: DadosUsuario = { id: null, nome: '', email: '', perfil: '' };

  // Controle de estado da edição
  nomeOriginal: string = '';
  nomeDirty: boolean = false;     // campo foi alterado?
  salvando: boolean = false;
  salvouOk: boolean = false;      // feedback visual de sucesso

  private readonly API_URL = 'http://localhost:9090/user';

  constructor(
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) {
    addIcons({
      logOutOutline, saveOutline, trashOutline,
      personOutline, mailOutline, lockClosedOutline,
      createOutline, shieldCheckmarkOutline, fingerPrintOutline,
      warningOutline, checkmarkCircleOutline, ellipse
    });
  }

  ngOnInit() {
    this.carregarDadosDoToken();
  }

  // ── Helpers ──────────────────────────────────────────────

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
      buttons: [{ icon: 'close-outline', role: 'cancel' }]
    });
    await toast.present();
  }

  // ── Inicialização ─────────────────────────────────────────

 carregarDadosDoToken() {
  const token = localStorage.getItem('token');
  if (!token) {
    this.navCtrl.navigateRoot('/login');
    return;
  }

  try {
    // ✅ Mesma conversão do Login.page.ts
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));

    this.dados = {
      id:     payload.id     ?? null,
      nome:   payload.nome   ?? '',
      email:  payload.email  ?? '',
      perfil: payload.perfil ?? 'user1'
    };
    this.nomeOriginal = this.dados.nome;

  } catch(e) {
    console.error('Erro ao decodificar token:', e);
    this.navCtrl.navigateRoot('/login');
  }
}
  
  // ── Avatar: iniciais do nome ──────────────────────────────

  getIniciais(): string {
    const partes = (this.dados.nome || 'U').trim().split(' ');
    if (partes.length === 1) return partes[0][0].toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  // ── Detecta mudança no campo nome ────────────────────────

  onNomeChange() {
    this.nomeDirty = this.dados.nome.trim() !== this.nomeOriginal.trim();
    // Limpa o estado de "salvo ok" se o usuário editar de novo
    if (this.salvouOk) this.salvouOk = false;
  }

  // ── Salvar nome ───────────────────────────────────────────

  salvar() {
    if (!this.dados.nome.trim()) {
      this.showToast('O nome não pode ser vazio.', 'warning');
      return;
    }
    if (!this.nomeDirty) return;

    this.salvando = true;

    this.http.patch(
      `${this.API_URL}/update-perfil`,
      { nome: this.dados.nome.trim() },
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.salvando = false;
        this.salvouOk = true;
        this.nomeOriginal = this.dados.nome.trim();
        this.nomeDirty = false;
        this.showToast('Perfil atualizado com sucesso!', 'success');

        // Reseta o feedback visual após 2s
        setTimeout(() => { this.salvouOk = false; }, 2000);
      },
      error: (err) => {
        this.salvando = false;
        const msg = err.error?.message || 'Erro ao atualizar perfil.';
        this.showToast(msg, 'danger');
      }
    });
  }

  // ── Logout ────────────────────────────────────────────────

  async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Sair',
      message: 'Deseja encerrar sua sessão?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sair',
          handler: () => {
            localStorage.removeItem('token');
            this.navCtrl.navigateRoot('/login');
          }
        }
      ]
    });
    await alert.present();
  }

  // ── Deletar conta ─────────────────────────────────────────

  async deletarConta() {
    // Primeira confirmação
    const alert1 = await this.alertCtrl.create({
      header: '⚠️ Excluir Conta',
      message: 'Esta ação é <strong>permanente e irreversível</strong>. Todos os seus dados serão removidos.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Continuar',
          role: 'destructive',
          handler: () => this.confirmarDelecao()
        }
      ]
    });
    await alert1.present();
  }

  private async confirmarDelecao() {
    // Segunda confirmação — evita exclusão acidental
    const alert2 = await this.alertCtrl.create({
      header: 'Tem certeza?',
      message: `Você está prestes a excluir a conta de <strong>${this.dados.email}</strong>. Não há como desfazer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir Definitivamente',
          role: 'destructive',
          handler: () => {
            this.http.delete(`${this.API_URL}/delete-me`, { headers: this.getHeaders() })
              .subscribe({
                next: () => {
                  localStorage.removeItem('token');
                  this.navCtrl.navigateRoot('/login');
                },
                error: (err) => {
                  const msg = err.error?.message || 'Erro ao excluir conta.';
                  this.showToast(msg, 'danger');
                }
              });
          }
        }
      ]
    });
    await alert2.present();
  }
}