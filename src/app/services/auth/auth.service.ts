import { Injectable, NgZone } from '@angular/core';
import { Auth0Provider, AuthConnect, AuthResult, ProviderOptions, TokenType } from '@ionic-enterprise/auth';
import { Platform } from '@ionic/angular';
import { BehaviorSubject, Observable } from 'rxjs';

const authOptions: ProviderOptions = {
  audience: 'https://io.ionic.demo.ac',
  clientId: 'yLasZNUGkZ19DGEjTmAITBfGXzqbvd00',
  discoveryUrl: 'https://dev-2uspt-sz.us.auth0.com/.well-known/openid-configuration',
  logoutUrl: 'http://localhost:8100/login',
  redirectUri: 'http://localhost:8100/login',
  scope: 'openid offline_access email picture profile',
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private isNative;
  private initializing: Promise<void> | undefined;
  private provider = new Auth0Provider();
  private authResult: AuthResult | undefined;

  private authenticationChange: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public authenticationChange$: Observable<boolean>;

  constructor(private platform: Platform, private ngZone: NgZone) {
    this.isNative = platform.is('hybrid');
    this.initialize();
    this.authenticationChange$ = this.authenticationChange.asObservable();
    this.isAuthenticated().then( authenticated => this.onAuthChange(authenticated));
  }

  private setup(): Promise<void> {
    return AuthConnect.setup({
      platform: this.isNative ? 'capacitor' : 'web',
      logLevel: 'DEBUG',
      ios: {
        webView: 'private',
      },
      web: {
        uiMode: 'popup',
        authFlow: 'implicit',
      },
    });
  }

  private initialize(): Promise<void> {
    if (!this.initializing) {
      this.initializing = new Promise( resolve => {
        this.setup().then(() => resolve());
      });
    }
    return this.initializing;
  }

  public async login(): Promise<void> {
    await this.initialize();
    this.authResult = await AuthConnect.login(this.provider, authOptions);
    this.onAuthChange(await this.isAuthenticated());
  }

  public async logout(): Promise<void> {
    await this.initialize();
    if (this.authResult) {
      await AuthConnect.logout(this.provider, this.authResult);
      this.authResult = undefined;
      this.onAuthChange(false);
    }
  }

  public async isAuthenticated(): Promise<boolean> {
    await this.initialize();
    return !!(await this.getAuthResult());
  }

  public async refreshAuth(authResult: AuthResult): Promise<AuthResult | undefined> {
    let newAuthResult: AuthResult | undefined;
    if (await AuthConnect.isRefreshTokenAvailable(authResult)) {
      try {
        newAuthResult = await AuthConnect.refreshSession(this.provider, authResult);
      } catch (err) {
        null;
      }
    }

    return newAuthResult;
  }

  public async getAuthResult(): Promise<AuthResult | undefined> {
    if (this.authResult && (await AuthConnect.isAccessTokenExpired(this.authResult))) {
      this.authResult = await this.refreshAuth(this.authResult);
    }
    return this.authResult;
  }

  private async onAuthChange(isAuthenticated: boolean): Promise<void> {
    this.ngZone.run(() => {
      this.authenticationChange.next(isAuthenticated);
    })
  }

  public async getAccessToken(): Promise<string | undefined> {
    await this.initialize();
    const res = await this.getAuthResult();
    return res?.accessToken;  
  }

  public async getUserName(): Promise<string | undefined> {
    await this.initialize();
    const res = await this.getAuthResult();
    if(res) {
      const data = (await AuthConnect.decodeToken(TokenType.id, res)) as { name: string };
      return data?.name;
    }
    return undefined;
  }

}
