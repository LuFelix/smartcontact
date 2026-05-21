import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-carousel',
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './carousel.html',
  styleUrl: './carousel.scss'
})
export class Carousel {
  currentSlide = 0;
  intervalId: any;

  slides = [
    {
      title: 'Networking Inteligente',
      description: 'Substitua o cartão de visita tradicional por uma experiência digital sem fricção via NFC.',
      icon: 'nfc'
    },
    {
      title: 'Perfil Dinâmico',
      description: 'Atualize seus dados, links e redes sociais instantaneamente sem precisar regravar sua tag.',
      icon: 'contact_page'
    },
    {
      title: 'Analytics de Conexão',
      description: 'Acompanhe o engajamento de seus contatos e receba notificações em tempo real a cada leitura.',
      icon: 'insights'
    }
  ];

  ngOnInit() {
    this.intervalId = setInterval(() => this.nextSlide(), 6000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
  }

  goToSlide(index: number) {
    this.currentSlide = index;
  }
}
