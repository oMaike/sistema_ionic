import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  closeOutline,
  createOutline,
  imageOutline,
  locateOutline,
  locationOutline,
  nutritionOutline,
  saveOutline,
  searchOutline,
  trashOutline
} from 'ionicons/icons';

interface Queijo {
  id: number;
  nome: string;
  descricao: string;
  tipo: string;
  origem: string;
  informacaoNutricional: string;
  imagemUrl: string | null;
}

interface LocalizacaoTempoReal {
  locationId: number | null;
  userId: number;
  nome: string;
  email: string;
  perfil: string;
  geolocalizacaoConsentida: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  source: 'watch' | 'manual' | 'ip' | null;
  sessionActive: number | null;
  capturedAt: string | null;
  lastSeenAt: string | null;
  segundosSemAtualizar: number | null;
  hasLocation: boolean;
  online: boolean;
}

@Component({
  selector: 'app-admin-queijos',
  templateUrl: './admin-queijos.page.html',
  styleUrls: ['./admin-queijos.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule]
})
export class AdminQueijosPage implements OnInit, OnDestroy {
  queijos: Queijo[] = [];
  queijosExibidos: Queijo[] = [];
  termoBusca = '';
  editandoId: number | null = null;
  localizacoesLogin: LocalizacaoTempoReal[] = [];
  isLoadingLocalizacoes = false;

  form: Omit<Queijo, 'id'> = this.criarFormVazio();

  private readonly STORAGE_KEY = 'adminQueijosCrud';
  private readonly API_URL = 'http://localhost:9090/user';
  private refreshLocalizacoesId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({
      addOutline,
      closeOutline,
      createOutline,
      imageOutline,
      locateOutline,
      locationOutline,
      nutritionOutline,
      saveOutline,
      searchOutline,
      trashOutline
    });
  }

  ngOnInit() {
    this.carregarQueijos();
    this.carregarLocalizacoesTempoReal();
    this.refreshLocalizacoesId = setInterval(() => {
      this.carregarLocalizacoesTempoReal(false);
    }, 10000);
  }

  ngOnDestroy() {
    if (this.refreshLocalizacoesId) {
      clearInterval(this.refreshLocalizacoesId);
      this.refreshLocalizacoesId = null;
    }
  }

  private criarFormVazio(): Omit<Queijo, 'id'> {
    return {
      nome: '',
      descricao: '',
      tipo: '',
      origem: '',
      informacaoNutricional: '',
      imagemUrl: null
    };
  }

  private carregarQueijos() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    this.queijos = raw ? JSON.parse(raw) : [];
    this.atualizarLista();
  }

  private salvarLocal() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queijos));
  }

  private getProximoId(): number {
    return Math.max(0, ...this.queijos.map((queijo) => queijo.id)) + 1;
  }

  buscarQueijos() {
    this.atualizarLista();
  }

  private atualizarLista() {
    const termo = this.termoBusca.toLowerCase().trim();

    if (!termo) {
      this.queijosExibidos = [...this.queijos];
      return;
    }

    this.queijosExibidos = this.queijos.filter((queijo) =>
      queijo.nome.toLowerCase().includes(termo) ||
      queijo.tipo.toLowerCase().includes(termo) ||
      queijo.origem.toLowerCase().includes(termo)
    );
  }

  selecionarImagem(event: Event) {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
      this.showToast('Selecione uma imagem valida.', 'warning');
      input.value = '';
      return;
    }

    if (arquivo.size > 2 * 1024 * 1024) {
      this.showToast('Escolha uma imagem de ate 2MB.', 'warning');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.form.imagemUrl = typeof reader.result === 'string' ? reader.result : null;
      input.value = '';
    };
    reader.onerror = () => {
      this.showToast('Erro ao carregar a imagem.', 'danger');
      input.value = '';
    };
    reader.readAsDataURL(arquivo);
  }

  removerImagem() {
    this.form.imagemUrl = null;
  }

  capturarLocalizacaoAtual() {
    this.carregarLocalizacoesTempoReal();
  }

  salvarQueijo() {
    if (!this.form.nome.trim()) {
      this.showToast('Informe o nome do queijo.', 'warning');
      return;
    }

    if (this.editandoId !== null) {
      const index = this.queijos.findIndex((queijo) => queijo.id === this.editandoId);
      if (index !== -1) {
        this.queijos[index] = {
          id: this.editandoId,
          ...this.normalizarForm()
        };
      }
      this.showToast('Queijo atualizado com sucesso!');
    } else {
      this.queijos.unshift({
        id: this.getProximoId(),
        ...this.normalizarForm()
      });
      this.showToast('Queijo cadastrado com sucesso!');
    }

    this.salvarLocal();
    this.cancelarEdicao();
    this.atualizarLista();
  }

  editarQueijo(queijo: Queijo) {
    this.editandoId = queijo.id;
    this.form = {
      nome: queijo.nome,
      descricao: queijo.descricao,
      tipo: queijo.tipo,
      origem: queijo.origem,
      informacaoNutricional: queijo.informacaoNutricional,
      imagemUrl: queijo.imagemUrl
    };
  }

  cancelarEdicao() {
    this.editandoId = null;
    this.form = this.criarFormVazio();
  }

  async excluirQueijo(id: number) {
    const queijo = this.queijos.find((item) => item.id === id);
    if (!queijo) return;

    const alert = await this.alertCtrl.create({
      header: 'Excluir queijo',
      message: `Deseja excluir "${queijo.nome}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.queijos = this.queijos.filter((item) => item.id !== id);
            if (this.editandoId === id) this.cancelarEdicao();
            this.salvarLocal();
            this.atualizarLista();
            this.showToast('Queijo excluido.', 'medium');
          }
        }
      ]
    });
    await alert.present();
  }

  private normalizarForm(): Omit<Queijo, 'id'> {
    return {
      nome: this.form.nome.trim(),
      descricao: this.form.descricao.trim(),
      tipo: this.form.tipo.trim(),
      origem: this.form.origem.trim(),
      informacaoNutricional: this.form.informacaoNutricional.trim(),
      imagemUrl: this.form.imagemUrl
    };
  }

  carregarLocalizacoesTempoReal(mostrarLoading: boolean = true) {
    if (mostrarLoading) this.isLoadingLocalizacoes = true;

    this.http
      .get<LocalizacaoTempoReal[]>(`${this.API_URL}/location/live`, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          this.localizacoesLogin = res;
          this.isLoadingLocalizacoes = false;
        },
        error: () => {
          this.isLoadingLocalizacoes = false;
          if (mostrarLoading) this.showToast('Erro ao carregar localizacoes em tempo real.', 'danger');
        }
      });
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getStatusLocalizacao(loc: LocalizacaoTempoReal): string {
    if (!loc.geolocalizacaoConsentida) return 'Sem consentimento';
    if (loc.online) return 'Online';
    if (loc.hasLocation) return 'Sem atualizacao';
    return 'Aguardando login';
  }

  getCorStatusLocalizacao(loc: LocalizacaoTempoReal): 'primary' | 'medium' | 'warning' {
    if (loc.online) return 'primary';
    if (loc.geolocalizacaoConsentida && !loc.hasLocation) return 'warning';
    return 'medium';
  }

  getOrigemLocalizacao(loc: LocalizacaoTempoReal): string {
    if (loc.source === 'watch') return 'GPS em tempo real';
    if (loc.source === 'ip') return 'IP aproximado';
    return 'Manual';
  }

  formatarDataLocalizacao(valor: string | null): string {
    if (!valor) return 'Sem registro';

    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return 'Sem registro';

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(data);
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'medium' = 'success'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 2200,
      position: 'bottom'
    });
    await toast.present();
  }
}
