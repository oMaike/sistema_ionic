import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Importação essencial para diretivas como *ngIf e *ngFor
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-tela3',
  templateUrl: './tela3.page.html',
  styleUrls: ['./tela3.page.scss'],
  standalone: true,
  // O CommonModule dentro do imports é o que resolve o erro do *ngIf
  imports: [
    IonicModule, 
    CommonModule, 
    FormsModule
  ]
})
export class Tela3Page implements OnInit {

  // Variável que o seu HTML (linha 18) está tentando acessar
  imagemPreview: string | null = null;

  constructor() { }

  ngOnInit() {
  }

  // Caso você tenha uma função para tirar foto, ela alimentaria a variável acima
  selecionarImagem() {
    // Exemplo: this.imagemPreview = 'caminho/da/foto.jpg';
  }

}