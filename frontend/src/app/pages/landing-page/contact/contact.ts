import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-contact',
  imports: [MatButtonModule, MatFormFieldModule, ReactiveFormsModule, MatInputModule, MatCardModule, MatIconModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss'
})
export class Contact {
  contactForm = new FormGroup({
    name: new FormControl(''),
    email: new FormControl(''),
    phone: new FormControl(''),
  });

  send() {
    if (this.contactForm.valid) {
      const dados = this.contactForm.value;
      alert(`Dados enviados:\n${JSON.stringify(dados, null, 2)}`);
    } else {
        const dados = this.contactForm.value;
        alert(`Dados enviados:\n${JSON.stringify(dados, null, 2)}`);
    }
  }
}
