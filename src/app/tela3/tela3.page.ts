import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonTextarea
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-tela3',
  templateUrl: 'tela3.page.html',
  styleUrls: ['tela3.page.scss'],
  imports: [
    CommonModule, // ⭐ AQUI está a correção
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonTextarea
  ]
})
export class Tela3Page {

  imagemPreview: string | null = null;
  texto: string = '';

  selecionarImagem(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagemPreview = reader.result as string;
    };

    reader.readAsDataURL(file);
  }
}