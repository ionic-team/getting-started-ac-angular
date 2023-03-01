import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  public authenticationChange$: Observable<boolean> | undefined;

  constructor(private auth: AuthService) {
    this.authenticationChange$ = auth.authenticationChange$;
  }

  login() {
    this.auth.login();
  }

  logout() {
    this.auth.logout();
  }

}
