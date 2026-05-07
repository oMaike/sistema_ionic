import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { IonicModule, ToastController } from '@ionic/angular';
import { forkJoin } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  personCircleOutline,
  saveOutline,
  searchOutline
} from 'ionicons/icons';

interface UsuarioPermissao {
  id: number;
  nome: string;
  email: string;
  aprovado: number;
  acessoAtivo: boolean;
  acessoOriginal: boolean;
}

@Component({
  selector: 'app-admin-permissoes',
  templateUrl: './admin-permissoes.page.html',
  styleUrls: ['./admin-permissoes.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule]
})
export class AdminPermissoesPage implements OnInit {
  usuarios: UsuarioPermissao[] = [];
  usuariosExibidos: UsuarioPermissao[] = [];
  termoBusca: string = '';
  isLoading: boolean = false;
  isSalvando: boolean = false;

  private readonly API_URL = 'http://localhost:9090/user';

  constructor(
    private http: HttpClient,
    private toastCtrl: ToastController
  ) {
    addIcons({
      personCircleOutline,
      saveOutline,
      searchOutline
    });
  }

  ngOnInit() {
    this.carregarUsuarios();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'medium' = 'success'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  carregarUsuarios() {
    this.isLoading = true;

    this.http
      .get<UsuarioPermissao[]>(`${this.API_URL}/estudantes-com-disciplinas`, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          this.usuarios = res.map((usuario) => ({
            ...usuario,
            acessoAtivo: usuario.aprovado !== 0,
            acessoOriginal: usuario.aprovado !== 0
          }));
          this.usuariosExibidos = [...this.usuarios];
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.showToast('Erro ao carregar permissões.', 'danger');
        }
      });
  }

  buscarUsuarios() {
    const termo = this.termoBusca.toLowerCase().trim();

    if (!termo) {
      this.usuariosExibidos = [...this.usuarios];
      return;
    }

    this.usuariosExibidos = this.usuarios.filter((usuario) =>
      usuario.nome.toLowerCase().includes(termo) ||
      usuario.email.toLowerCase().includes(termo)
    );
  }

  temAlteracaoPermissoes(): boolean {
    return this.usuarios.some((usuario) => usuario.acessoAtivo !== usuario.acessoOriginal);
  }

  salvarPermissoes() {
    const alterados = this.usuarios.filter((usuario) => usuario.acessoAtivo !== usuario.acessoOriginal);

    if (alterados.length === 0) {
      this.showToast('Nenhuma permissão alterada.', 'medium');
      return;
    }

    this.isSalvando = true;

    const requests = alterados.map((usuario) =>
      this.http.patch(`${this.API_URL}/desativar`, { id: usuario.id }, { headers: this.getHeaders() })
    );

    forkJoin(requests).subscribe({
      next: () => {
        alterados.forEach((usuario) => {
          usuario.acessoOriginal = usuario.acessoAtivo;
          usuario.aprovado = usuario.acessoAtivo ? 1 : 0;
        });
        this.isSalvando = false;
        this.showToast('Permissões salvas com sucesso!', 'success');
      },
      error: () => {
        this.isSalvando = false;
        this.showToast('Erro ao salvar permissões. Tente novamente.', 'danger');
      }
    });
  }
}
