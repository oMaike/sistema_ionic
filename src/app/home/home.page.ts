import { Component, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; // Necessário para o modal e lixeira
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonInput,
  IonItem, IonButton, IonMenu, IonMenuButton, IonButtons, IonIcon,
  IonLabel, IonModal, IonRow, IonCol
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons'; // Para os ícones
import { personAddOutline, createOutline, trashOutline, barChartOutline } from 'ionicons/icons';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonInput, IonItem, IonButton, IonMenu, IonMenuButton,
    IonButtons, IonIcon, IonLabel, IonModal, IonRow, IonCol
  ],
})
export class HomePage {
  @ViewChild('graficoCanvas') graficoCanvas!: ElementRef;

  nome: string = '';
  isModalOpen = false;
  lixeira: string[] = []; // Armazena os nomes "deletados"
  chart: any;

  constructor() {
    // Registra os ícones que usaremos no menu
    addIcons({ personAddOutline, createOutline, trashOutline, barChartOutline });
  }

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
  }

  // Gera o gráfico ao abrir o modal
  gerarGrafico() {
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(this.graficoCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Estudantes', 'Lixeira', 'Acessos'],
        datasets: [{
          label: 'Estatísticas do App',
          data: [10, this.lixeira.length, 5], // Dados dinâmicos da lixeira
          backgroundColor: ['#3880ff', '#eb445a', '#2dd36f']
        }]
      },
      options: { responsive: true }
    });
  }

  filtrarInput(event: any) {
    const valor = event.target.value || '';
    this.nome = valor.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    event.target.value = this.nome;
  }

  sanitizarNome(valor: string): string {
    return valor.replace(/<[^>]*>/g, '').replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim();
  }

  limpar() {
    this.nome = '';
  }

  incluir() {
    if (!this.nome) return alert('Digite um nome antes!');
    this.nome = this.sanitizarNome(this.nome);
    alert('Estudante Incluído: ' + this.nome);
    this.limpar();
  }

  alterar() {
    if (!this.nome) return alert('Digite o nome para alterar!');
    alert('Alterar: ' + this.nome);
  }

  excluir() {
    if (!this.nome) return alert('Digite um nome para enviar à lixeira!');
    this.lixeira.push(this.nome); // Guarda na memória
    alert(`${this.nome} foi movido para a lixeira.`);
    this.limpar();
  }
}