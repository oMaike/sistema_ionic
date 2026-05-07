import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  IonicModule,
  MenuController,
  ToastController,
  AlertController,
  LoadingController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  menu, barChartOutline, checkmarkCircle, trash,
  personAddOutline, searchOutline, add, closeOutline,
  checkmarkOutline, trashOutline, addOutline,
  cloudDownloadOutline, chevronForwardOutline,
  personCircleOutline, pieChartOutline, checkmarkCircleOutline,
  createOutline, saveOutline, removeCircleOutline, addCircleOutline,
  schoolOutline, timeOutline, checkmarkDoneOutline
} from 'ionicons/icons';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// ----------------------------------------------------------------
// INTERFACES
// ----------------------------------------------------------------

interface Disciplina {
  id: number;
  nome: string;
  status: 'cursando' | 'concluida';
}

interface Estudante {
  id: number;
  nome: string;
  email: string;
  aprovado?: number;
  acessoAtivo?: boolean;
  acessoOriginal?: boolean;
  disciplinas?: string;           // campo legado da API
  disciplinasLista?: Disciplina[]; // lista gerenciada localmente no CRUD
}

interface UserPendente {
  id: number;
  nome: string;
  email: string;
}

interface Estatisticas {
  meses?: string[];
  contagem?: number[];
  aprovados?: number;
}

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.page.html',
  styleUrls: ['./admin-panel.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule]
})
export class AdminPanelPage implements OnInit {

  // Referência ao canvas do modal de gráficos do sistema
  @ViewChild('graficoCanvas') graficoCanvas!: ElementRef;

  // Referência ao canvas do modal de gráfico do aluno individual
  @ViewChild('graficoAlunoCanvas') graficoAlunoCanvas!: ElementRef;

  // ----------------------------------------------------------------
  // ESTADO DO BANCO (seção do menu)
  // ----------------------------------------------------------------
  pendentes: UserPendente[] = [];
  estudantesGeral: Estudante[] = [];
  estudantesExibidos: Estudante[] = [];
  dadosEstatisticos: Estatisticas | null = null;
  mostrarEstudantes: boolean = false;
  isLoadingEstudantes: boolean = false;
  termoBusca: string = '';

  // ----------------------------------------------------------------
  // CRUD PRINCIPAL DE ALUNOS (card central)
  // ----------------------------------------------------------------
  estudantesCrud: Estudante[] = [];           // lista master do CRUD
  estudantesCrudExibidos: Estudante[] = [];   // lista filtrada para exibição
  termoBuscaCrud: string = '';
  proximoIdCrud: number = 1;                  // auto-increment local

  // Formulário do modal de criar/editar
  isModalCriarAberto: boolean = false;
  modoEdicaoModal: boolean = false;
  idEdicaoModal: number | null = null;
  formNome: string = '';
  formEmail: string = '';

  // Edição inline direto na lista
  editandoId: number | null = null;
  editNome: string = '';
  editEmail: string = '';

  // ----------------------------------------------------------------
  // SUB-CRUD DE DISCIPLINAS
  // ----------------------------------------------------------------
  alunoExpandido: number | null = null;       // ID do aluno com disciplinas abertas
  novaDisciplinaNome: string = '';
  novaDisciplinaStatus: 'cursando' | 'concluida' = 'cursando';
  proximoIdDisciplina: number = 1;

  // ----------------------------------------------------------------
  // GRÁFICO DO ALUNO INDIVIDUAL
  // ----------------------------------------------------------------
  isModalGraficoAlunoAberto: boolean = false;
  alunoSelecionadoGrafico: Estudante | null = null;
  graficoAlunoTipo: string = 'pizza';
  chartAluno: Chart | null = null;

  // ----------------------------------------------------------------
  // GRÁFICOS DO SISTEMA
  // ----------------------------------------------------------------
  isModalOpen: boolean = false;
  isLoading: boolean = false;
  graficoSelecionado: string = 'barras';
  chart: Chart | null = null;

  // ----------------------------------------------------------------
  // OUTROS
  // ----------------------------------------------------------------
  lixeira: string[] = [];
  nomeEstudante: string = '';

  private readonly API_URL = 'http://localhost:9090/user';

  constructor(
    private http: HttpClient,
    private router: Router,
    private menuCtrl: MenuController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {
    addIcons({
      menu, barChartOutline, checkmarkCircle, trash,
      personAddOutline, searchOutline, add, closeOutline,
      checkmarkOutline, trashOutline, addOutline,
      cloudDownloadOutline, chevronForwardOutline,
      personCircleOutline, pieChartOutline, checkmarkCircleOutline,
      createOutline, saveOutline, removeCircleOutline, addCircleOutline,
      schoolOutline, timeOutline, checkmarkDoneOutline
    });
  }

  ngOnInit() {
    this.carregarPendentes();
    this.sincronizarCrudComBanco();
  }

  // ================================================================
  // HELPERS PRIVADOS
  // ================================================================

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
      position: 'bottom',
      buttons: [{ icon: 'close-outline', role: 'cancel' }]
    });
    await toast.present();
  }

  private handleError(msg: string) {
    this.showToast(msg, 'danger');
  }

  // ================================================================
  // CARREGAMENTOS (MENU)
  // ================================================================

  carregarPendentes() {
    this.http
      .get<UserPendente[]>(`${this.API_URL}/pendentes`, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => { this.pendentes = res; },
        error: () => this.handleError('Erro ao carregar aprovações pendentes.')
      });
  }

  async liberarDadosBanco() {
    this.isLoadingEstudantes = true;
    this.http
      .get<Estudante[]>(`${this.API_URL}/estudantes-com-disciplinas`, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          this.estudantesGeral = this.quickSort(res);
          this.estudantesExibidos = [...this.estudantesGeral];
          this.mostrarEstudantes = true;
          this.isLoadingEstudantes = false;
          this.menuCtrl.open();
        },
        error: () => {
          this.isLoadingEstudantes = false;
          this.handleError('Erro ao carregar dados dos estudantes.');
        }
      });
  }

  /**
   * Ao inicializar, tenta popular o CRUD com dados do banco.
   * Se a API falhar, o CRUD começa vazio — o usuário pode inserir manualmente.
   */
  private sincronizarCrudComBanco() {
    this.http
      .get<Estudante[]>(`${this.API_URL}/estudantes-com-disciplinas`, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          // Converte o campo `disciplinas` (string legada) para lista gerenciável
          this.estudantesCrud = res.map((est) => ({
            ...est,
            acessoAtivo: est.aprovado !== 0,
            acessoOriginal: est.aprovado !== 0,
            disciplinasLista: this.parsearDisciplinasString(est.disciplinas)
          }));
          this.proximoIdCrud = Math.max(0, ...this.estudantesCrud.map(e => e.id)) + 1;
          this.proximoIdDisciplina =
            Math.max(
              0,
              ...this.estudantesCrud.flatMap(e =>
                (e.disciplinasLista ?? []).map(d => d.id)
              )
            ) + 1;
          this.atualizarListaCrud();
        },
        // Se API offline, continua com lista vazia — não bloqueia o admin
        error: () => {}
      });
  }

  /**
   * Converte a string legada "Matemática, Física" em lista de Disciplina[].
   * Status padrão: 'cursando' (não temos esse dado na string).
   */
  private parsearDisciplinasString(raw?: string): Disciplina[] {
    if (!raw) return [];
    return raw.split(',').map((nome, i) => ({
      id: this.proximoIdDisciplina + i,
      nome: nome.trim(),
      status: 'cursando'
    }));
  }

  // ================================================================
  // AÇÕES DO ADMIN (aprovações)
  // ================================================================

  aprovar(id: number) {
    this.http
      .patch(`${this.API_URL}/aprovar`, { id }, { headers: this.getHeaders() })
      .subscribe({
        next: () => {
          this.showToast('Usuário aprovado com sucesso!', 'success');
          this.carregarPendentes();
          this.sincronizarCrudComBanco();
          if (this.mostrarEstudantes) this.liberarDadosBanco();
        },
        error: () => this.handleError('Erro ao aprovar usuário.')
      });
  }

  async deletar(id: number) {
    const alert = await this.alertCtrl.create({
      header: 'Recusar Solicitação',
      message: 'Tem certeza que deseja recusar e remover esta solicitação?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Recusar',
          role: 'destructive',
          handler: () => {
            this.http
              .delete(`${this.API_URL}/delete/${id}`, { headers: this.getHeaders() })
              .subscribe({
                next: () => {
                  this.showToast('Solicitação recusada.', 'warning');
                  this.carregarPendentes();
                },
                error: () => this.handleError('Erro ao recusar solicitação.')
              });
          }
        }
      ]
    });
    await alert.present();
  }

  // ================================================================
  // CRUD PRINCIPAL DE ALUNOS
  // ================================================================

  private atualizarListaCrud() {
    const termo = this.termoBuscaCrud.toLowerCase().trim();
    if (!termo) {
      this.estudantesCrudExibidos = [...this.estudantesCrud];
    } else {
      this.estudantesCrudExibidos = this.estudantesCrud.filter(e =>
        e.nome.toLowerCase().includes(termo) || e.email.toLowerCase().includes(termo)
      );
    }
  }

  buscarManualCrud() {
    this.atualizarListaCrud();
  }

  async abrirPaginaPermissoes() {
    await this.menuCtrl.close();
    await this.router.navigate(['/admin-permissoes']);
  }

  // ----- CRIAR -----

  abrirModalCriarAluno() {
    this.modoEdicaoModal = false;
    this.idEdicaoModal = null;
    this.formNome = '';
    this.formEmail = '';
    this.isModalCriarAberto = true;
  }

  fecharModalCriar() {
    this.isModalCriarAberto = false;
  }

  salvarAluno() {
    if (!this.formNome.trim()) {
      this.showToast('Informe o nome do aluno.', 'warning');
      return;
    }

    if (this.modoEdicaoModal && this.idEdicaoModal !== null) {
      // ATUALIZAR via API e localmente
      const idx = this.estudantesCrud.findIndex(e => e.id === this.idEdicaoModal);
      if (idx !== -1) {
        this.estudantesCrud[idx].nome = this.formNome;
        this.estudantesCrud[idx].email = this.formEmail;
      }

      this.http
        .put(
          `${this.API_URL}/atualizar/${this.idEdicaoModal}`,
          { nome: this.formNome, email: this.formEmail },
          { headers: this.getHeaders() }
        )
        .subscribe({
          next: () => this.showToast('Aluno atualizado!', 'success'),
          error: () => this.showToast('Salvo localmente (API indisponível).', 'warning')
        });

    } else {
      // INSERIR — tenta persistir na API, garante inserção local
      const novoAluno: Estudante = {
        id: this.proximoIdCrud++,
        nome: this.formNome,
        email: this.formEmail,
        aprovado: 1,
        acessoAtivo: true,
        acessoOriginal: true,
        disciplinasLista: []
      };

      this.http
        .post<Estudante>(`${this.API_URL}/criar`, novoAluno, { headers: this.getHeaders() })
        .subscribe({
          next: (res) => {
            novoAluno.id = res.id ?? novoAluno.id; // usa ID retornado pela API
            this.showToast(`Aluno "${novoAluno.nome}" cadastrado!`, 'success');
          },
          error: () => this.showToast('Inserido localmente (API indisponível).', 'warning')
        });

      this.estudantesCrud.push(novoAluno);
    }

    this.atualizarListaCrud();
    this.fecharModalCriar();
  }

  // ----- EDIÇÃO INLINE -----

  iniciarEdicao(est: Estudante) {
    this.editandoId = est.id;
    this.editNome = est.nome;
    this.editEmail = est.email;
  }

  cancelarEdicao() {
    this.editandoId = null;
    this.editNome = '';
    this.editEmail = '';
  }

  salvarEdicao(id: number) {
    if (!this.editNome.trim()) {
      this.showToast('Nome não pode ser vazio.', 'warning');
      return;
    }

    const idx = this.estudantesCrud.findIndex(e => e.id === id);
    if (idx !== -1) {
      this.estudantesCrud[idx].nome = this.editNome;
      this.estudantesCrud[idx].email = this.editEmail;
    }

    this.http
      .put(
        `${this.API_URL}/atualizar/${id}`,
        { nome: this.editNome, email: this.editEmail },
        { headers: this.getHeaders() }
      )
      .subscribe({
        next: () => this.showToast('Aluno atualizado!', 'success'),
        error: () => this.showToast('Atualizado localmente.', 'warning')
      });

    this.cancelarEdicao();
    this.atualizarListaCrud();
  }

  // ----- EXCLUIR -----

  async excluirAlunoCrud(id: number) {
    const aluno = this.estudantesCrud.find(e => e.id === id);
    if (!aluno) return;

    const alert = await this.alertCtrl.create({
      header: 'Excluir Aluno',
      message: `Deseja excluir "${aluno.nome}"? Esta ação não pode ser desfeita.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.lixeira.push(aluno.nome);
            this.estudantesCrud = this.estudantesCrud.filter(e => e.id !== id);

            if (this.alunoExpandido === id) this.alunoExpandido = null;

            this.http
              .delete(`${this.API_URL}/delete/${id}`, { headers: this.getHeaders() })
              .subscribe({
                next: () => this.showToast(`"${aluno.nome}" excluído.`, 'warning'),
                error: () => this.showToast('Removido localmente (API indisponível).', 'medium')
              });

            this.atualizarListaCrud();
          }
        }
      ]
    });
    await alert.present();
  }

  // ================================================================
  // SUB-CRUD DE DISCIPLINAS
  // ================================================================

  toggleDisciplinas(id: number) {
    this.alunoExpandido = this.alunoExpandido === id ? null : id;
    this.novaDisciplinaNome = '';
    this.novaDisciplinaStatus = 'cursando';
  }

  getDisciplinasPorStatus(alunoId: number, status: 'cursando' | 'concluida'): Disciplina[] {
    const aluno = this.estudantesCrud.find(e => e.id === alunoId);
    return (aluno?.disciplinasLista ?? []).filter(d => d.status === status);
  }

  contarDisciplinas(est: Estudante): number {
    return (est.disciplinasLista ?? []).length;
  }

  adicionarDisciplina(alunoId: number) {
    if (!this.novaDisciplinaNome.trim()) {
      this.showToast('Informe o nome da disciplina.', 'warning');
      return;
    }

    const aluno = this.estudantesCrud.find(e => e.id === alunoId);
    if (!aluno) return;

    if (!aluno.disciplinasLista) aluno.disciplinasLista = [];

    const nova: Disciplina = {
      id: this.proximoIdDisciplina++,
      nome: this.novaDisciplinaNome.trim(),
      status: this.novaDisciplinaStatus
    };
    aluno.disciplinasLista.push(nova);

    // Sincroniza campo legado
    this.sincronizarCampoLegado(aluno);

    this.showToast(`Disciplina "${nova.nome}" adicionada.`, 'success');
    this.novaDisciplinaNome = '';
    this.novaDisciplinaStatus = 'cursando';
    this.atualizarListaCrud();
  }

  concluirDisciplina(alunoId: number, disciplinaId: number) {
    const aluno = this.estudantesCrud.find(e => e.id === alunoId);
    if (!aluno?.disciplinasLista) return;

    const disc = aluno.disciplinasLista.find(d => d.id === disciplinaId);
    if (disc) {
      disc.status = 'concluida';
      this.showToast(`"${disc.nome}" marcada como concluída.`, 'success');
      this.sincronizarCampoLegado(aluno);
    }
  }

  removerDisciplina(alunoId: number, disciplinaId: number) {
    const aluno = this.estudantesCrud.find(e => e.id === alunoId);
    if (!aluno?.disciplinasLista) return;

    const disc = aluno.disciplinasLista.find(d => d.id === disciplinaId);
    aluno.disciplinasLista = aluno.disciplinasLista.filter(d => d.id !== disciplinaId);
    this.sincronizarCampoLegado(aluno);

    if (disc) this.showToast(`"${disc.nome}" removida.`, 'medium');
    this.atualizarListaCrud();
  }

  /** Mantém o campo `disciplinas` (string legada) sincronizado com a lista */
  private sincronizarCampoLegado(aluno: Estudante) {
    aluno.disciplinas = (aluno.disciplinasLista ?? [])
      .map(d => d.nome)
      .join(', ');
  }

  // ================================================================
  // GRÁFICO DO ALUNO INDIVIDUAL
  // ================================================================

  abrirGraficoAluno(est: Estudante) {
    this.alunoSelecionadoGrafico = est;
    this.graficoAlunoTipo = 'pizza';
    this.isModalGraficoAlunoAberto = true;
  }

  fecharGraficoAluno() {
    this.isModalGraficoAlunoAberto = false;
    if (this.chartAluno) {
      this.chartAluno.destroy();
      this.chartAluno = null;
    }
    this.alunoSelecionadoGrafico = null;
  }

  gerarGraficoAluno() {
    if (this.chartAluno) {
      this.chartAluno.destroy();
      this.chartAluno = null;
    }

    // Aguarda o canvas estar disponível após a renderização
    setTimeout(() => {
      if (!this.graficoAlunoCanvas?.nativeElement || !this.alunoSelecionadoGrafico) return;

      const ctx = this.graficoAlunoCanvas.nativeElement;
      const aluno = this.alunoSelecionadoGrafico;

      const cursando = this.getDisciplinasPorStatus(aluno.id, 'cursando').length;
      const concluidas = this.getDisciplinasPorStatus(aluno.id, 'concluida').length;
      const ehPizza = this.graficoAlunoTipo === 'pizza';

      this.chartAluno = new Chart(ctx, {
        type: ehPizza ? 'pie' : 'bar',
        data: {
          labels: ['Cursando', 'Concluídas'],
          datasets: [{
            label: 'Disciplinas',
            data: [cursando, concluidas],
            backgroundColor: ['#3dc2ff', '#2dd36f'],
            borderRadius: ehPizza ? 0 : 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            title: {
              display: true,
              text: `Disciplinas de ${aluno.nome}`
            }
          }
        }
      });
    }, 200);
  }

  // ================================================================
  // GRÁFICOS DO SISTEMA
  // ================================================================

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    if (!isOpen && this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  chamarGraficosIniciais() {
    this.trocarGrafico();
  }

  async trocarGrafico() {
    this.isLoading = true;

    this.http
      .get<Estatisticas>(`${this.API_URL}/estatisticas`, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          this.dadosEstatisticos = res;
          setTimeout(() => {
            this.isLoading = false;
            this.gerarGrafico();
          }, 400);
        },
        error: () => {
          // Gera gráfico com dados locais se a API falhar
          setTimeout(() => {
            this.isLoading = false;
            this.gerarGrafico();
          }, 300);
        }
      });
  }

  gerarGrafico() {
    if (this.chart) this.chart.destroy();

    // CORREÇÃO: usa setTimeout para garantir que o canvas já foi renderizado
    setTimeout(() => {
      if (!this.graficoCanvas?.nativeElement) return;

      const ctx = this.graficoCanvas.nativeElement;
      const ehBarras = this.graficoSelecionado === 'barras';

      this.chart = new Chart(ctx, {
        type: ehBarras ? 'bar' : 'pie',
        data: {
          labels: ehBarras
            ? ['Estudantes (CRUD)', 'Lixeira', 'Pendentes']
            : ['Aprovados', 'Pendentes'],
          datasets: [{
            label: 'Visão Geral',
            data: ehBarras
              ? [this.estudantesCrud.length, this.lixeira.length, this.pendentes.length]
              : [this.estudantesCrud.length, this.pendentes.length],
            backgroundColor: ['#2dd36f', '#eb445a', '#ffc409'],
            borderRadius: ehBarras ? 6 : 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }, 150);
  }

  // ================================================================
  // BUSCA DO MENU (alunos do banco)
  // ================================================================

  buscarManual() {
    if (!this.termoBusca.trim()) {
      this.estudantesExibidos = [...this.estudantesGeral];
      return;
    }
    const termo = this.termoBusca.toLowerCase();
    this.estudantesExibidos = this.estudantesGeral.filter(est =>
      est.nome.toLowerCase().includes(termo)
    );
  }

  // ================================================================
  // QUICKSORT
  // ================================================================

  quickSort(arr: Estudante[]): Estudante[] {
    if (arr.length <= 1) return arr;
    const pivot = arr[arr.length - 1];
    const left: Estudante[] = [];
    const right: Estudante[] = [];
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i].nome.toLowerCase() < pivot.nome.toLowerCase()) {
        left.push(arr[i]);
      } else {
        right.push(arr[i]);
      }
    }
    return [...this.quickSort(left), pivot, ...this.quickSort(right)];
  }

  // ================================================================
  // INPUT HELPERS
  // ================================================================

  filtrarInput(event: any) {
    const valor: string = event.target.value ?? '';
    const filtrado = valor.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    this.nomeEstudante = filtrado;
    this.formNome = filtrado;
    event.target.value = filtrado;
  }

  incluirEstudante() {
    if (!this.nomeEstudante.trim()) {
      this.showToast('Digite um nome antes de incluir!', 'warning');
      return;
    }
    this.showToast(`Estudante "${this.nomeEstudante}" incluído localmente.`, 'success');
    this.nomeEstudante = '';
  }

  excluirEstudante() {
    if (!this.nomeEstudante.trim()) {
      this.showToast('Digite um nome para enviar à lixeira!', 'warning');
      return;
    }
    this.lixeira.push(this.nomeEstudante);
    this.showToast(`"${this.nomeEstudante}" movido para a lixeira.`, 'medium');
    this.nomeEstudante = '';
  }
}
