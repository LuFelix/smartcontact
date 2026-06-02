import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, map } from 'rxjs';
import { RoleService } from '../../../users/services/role.service';
import { User } from '../../../shared/models/users.models';
import { Role } from '../../../shared/models/role.model';

@Component({
  selector: 'app-promotion-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './promotion-dialog.html',
  styleUrls: ['./promotion-dialog.scss']
})
export class PromotionDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private roleService = inject(RoleService);
  private dialogRef = inject(MatDialogRef<PromotionDialogComponent>);

  promotionForm: FormGroup;
  availableRoles$!: Observable<Role[]>;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { user: User }) {
    this.promotionForm = this.fb.group({
      roleId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Busca roles e filtra 'contato'
    this.availableRoles$ = this.roleService.findAllActiveRoles().pipe(
      map(roles => roles.filter(r => r.name?.toLowerCase() !== 'contato'))
    );
  }

  confirm(): void {
    if (this.promotionForm.valid) {
      this.dialogRef.close(this.promotionForm.value.roleId);
    }
  }
}
