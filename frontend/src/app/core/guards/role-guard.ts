import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRoles: string[] = route.data['roles'];

  if (!authService.isLoggedIn() || !expectedRoles || expectedRoles.length === 0) {
    router.navigate(['/login']);
  }
  
  const userRole = authService.userRole()?.toLowerCase();

  if (userRole && expectedRoles.some(r => r.toLowerCase() === userRole)) {
    return true; 
  }

  router.navigate(['/app/dashboard']);
  return false;
};
