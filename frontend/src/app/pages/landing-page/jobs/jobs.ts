import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './jobs.html',
  styleUrl: './jobs.scss'
})
export class Jobs {
    vagas = [
    {
      titulo: 'Engenheiro de Software Fullstack',
      localizacao: 'Híbrido / Maceió',
      tipo: 'Full-time',
      tags: ['Angular', 'NestJS', 'PostgreSQL'],
      descricao: 'Atue no desenvolvimento core da plataforma SmartContact, desde a arquitetura do backend até interfaces de alta performance.'
    },
    {
      titulo: 'Especialista em Sistemas Embarcados',
      localizacao: 'Remoto',
      tipo: 'Contract',
      tags: ['NFC', 'RFID', 'C++'],
      descricao: 'Responsável pela integração e otimização da comunicação entre tags físicas e nossa camada de redirecionamento inteligente.'
    },
    {
      titulo: 'Designer de Produto (UX/UI)',
      localizacao: 'Remoto',
      tipo: 'Full-time',
      tags: ['Figma', 'Mobile-First', 'Design System'],
      descricao: 'Desenvolva experiências memoráveis para os perfis digitais e dashboards de analytics da plataforma.'
    }
  ];
}
