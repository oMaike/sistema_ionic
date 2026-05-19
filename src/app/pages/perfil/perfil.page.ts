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
  warningOutline, checkmarkCircleOutline, ellipse,
  imageOutline, menuOutline, qrCodeOutline,
  cameraOutline
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

  nomeOriginal: string = '';
  nomeDirty: boolean = false;
  salvando: boolean = false;
  salvouOk: boolean = false;
  fotoPerfilUrl: string | null = null;

  // ── Texto editável ────────────────────────────────────
  textoUsuario: string = '';
  consultorAberto: boolean = false;

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
      warningOutline, checkmarkCircleOutline, ellipse,
      imageOutline, menuOutline, qrCodeOutline,
      cameraOutline
    });
  }

  ngOnInit() {
    this.carregarDadosDoToken();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastCtrl.create({
      message, duration: 2500, color, position: 'bottom',
      buttons: [{ icon: 'close-outline', role: 'cancel' }]
    });
    await toast.present();
  }

  carregarDadosDoToken() {
    const token = localStorage.getItem('token');
    if (!token) { this.navCtrl.navigateRoot('/login'); return; }
    try {
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
      this.carregarFotoPerfil();
    } catch(e) {
      this.navCtrl.navigateRoot('/login');
    }
  }

  getIniciais(): string {
    const partes = (this.dados.nome || 'U').trim().split(' ');
    if (partes.length === 1) return partes[0][0].toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  onNomeChange() {
    this.nomeDirty = this.dados.nome.trim() !== this.nomeOriginal.trim();
    if (this.salvouOk) this.salvouOk = false;
  }

  toggleConsultor() {
    this.consultorAberto = !this.consultorAberto;
  }

  private getFotoPerfilKey(): string {
    const identificador = this.dados.id ?? (this.dados.email || 'usuario');
    return `fotoPerfil:${identificador}`;
  }

  private carregarFotoPerfil() {
    this.fotoPerfilUrl = localStorage.getItem(this.getFotoPerfilKey());
  }

  selecionarFotoPerfil(event: Event) {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
      this.showToast('Selecione uma imagem válida.', 'warning');
      input.value = '';
      return;
    }

    if (arquivo.size > 2 * 1024 * 1024) {
      this.showToast('Escolha uma imagem de até 2MB.', 'warning');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultado = typeof reader.result === 'string' ? reader.result : null;
      if (!resultado) {
        this.showToast('Não foi possível carregar a imagem.', 'danger');
        return;
      }

      try {
        localStorage.setItem(this.getFotoPerfilKey(), resultado);
        this.fotoPerfilUrl = resultado;
        this.showToast('Foto de perfil atualizada!');
      } catch {
        this.showToast('Imagem muito grande para salvar localmente.', 'danger');
      } finally {
        input.value = '';
      }
    };
    reader.onerror = () => {
      this.showToast('Erro ao ler a imagem.', 'danger');
      input.value = '';
    };
    reader.readAsDataURL(arquivo);
  }

  salvar() {
    if (!this.dados.nome.trim()) { this.showToast('O nome não pode ser vazio.', 'warning'); return; }
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
        this.showToast('Perfil atualizado com sucesso!');
        setTimeout(() => { this.salvouOk = false; }, 2000);
      },
      error: (err) => {
        this.salvando = false;
        this.showToast(err.error?.message || 'Erro ao atualizar perfil.', 'danger');
      }
    });
  }

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

  enviarTexto() {
  if (!this.textoUsuario.trim()) {
    this.showToast('Digite algo.', 'warning');
    return;
  }

  // substitua pela sua lógica de envio real (ex: HTTP POST)
  console.log('Texto enviado:', this.textoUsuario);
  this.showToast('Texto enviado com sucesso!', 'success');
}

  async deletarConta() {
    const alert1 = await this.alertCtrl.create({
      header: 'Excluir Conta',
      message: 'Esta ação é <strong>permanente e irreversível</strong>. Todos os seus dados serão removidos.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Continuar', role: 'destructive', handler: () => this.confirmarDelecao() }
      ]
    });
    await alert1.present();
  }

  private async confirmarDelecao() {
    const alert2 = await this.alertCtrl.create({
      header: 'Tem certeza?',
      message: `Você está prestes a excluir a conta de <strong>${this.dados.email}</strong>. Não há como desfazer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir Definitivamente',
          role: 'destructive',
          handler: () => {
            this.http.delete(`${this.API_URL}/delete-me`, { headers: this.getHeaders() }).subscribe({
              next: () => {
                localStorage.removeItem('token');
                this.navCtrl.navigateRoot('/login');
              },
              error: (err) => this.showToast(err.error?.message || 'Erro ao excluir conta.', 'danger')
            });
          }
        }
      ]
    });
    await alert2.present();
  }
}
