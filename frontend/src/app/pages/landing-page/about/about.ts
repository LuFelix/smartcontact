import { Component } from '@angular/core';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-about',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './about.html',
  styleUrl: './about.scss'
})
export class About {

}
