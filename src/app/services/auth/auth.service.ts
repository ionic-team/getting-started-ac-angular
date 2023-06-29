import { Injectable, NgZone } from '@angular/core';
import {
  Auth0Provider,
  AuthConnect,
  AuthResult,
  ProviderOptions,
  TokenType,
} from '@ionic-enterprise/auth';
import { Platform } from '@ionic/angular';
import { BehaviorSubject, Observable } from 'rxjs';
import { VaultService } from '../vault/vault.service';
import { baseConfig, mobileConfig, webConfig } from '../../../config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private isNative;
  private authOptions: ProviderOptions;
  private initializing: Promise<void> | undefined;
  private provider = new Auth0Provider();

  private authenticationChange: BehaviorSubject<boolean> = new BehaviorSubject(
    false
  );
  public authenticationChange$: Observable<boolean>;

  constructor(
    platform: Platform,
    private ngZone: NgZone,
    private vault: VaultService
  ) {
    this.isNative = platform.is('hybrid');
    this.authOptions = {
      ...baseConfig,
      ...(this.isNative ? mobileConfig : webConfig),
    };
    this.initialize();
    this.authenticationChange$ = this.authenticationChange.asObservable();
    this.isAuthenticated().then((authenticated) =>
      this.onAuthChange(authenticated)
    );
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
      this.initializing = new Promise((resolve) => {
        this.setup().then(() => resolve());
      });
    }
    return this.initializing;
  }

  public async login(): Promise<void> {
    await this.initialize();
    const authResult = await AuthConnect.login(this.provider, this.authOptions);
    await this.saveAuthResult(authResult);
  }

  public async logout(): Promise<void> {
    await this.initialize();
    const authResult = await this.getAuthResult();
    if (authResult) {
      await AuthConnect.logout(this.provider, authResult);
      await this.saveAuthResult(null);
    }
  }

  public async isAuthenticated(): Promise<boolean> {
    await this.initialize();
    return !!(await this.getAuthResult());
  }

  public async refreshAuth(authResult: AuthResult): Promise<AuthResult | null> {
    let newAuthResult: AuthResult | null = null;
    if (await AuthConnect.isRefreshTokenAvailable(authResult)) {
      try {
        newAuthResult = await AuthConnect.refreshSession(
          this.provider,
          authResult
        );
      } catch (err) {
        null;
      }
      this.saveAuthResult(newAuthResult);
    }

    return newAuthResult;
  }

  public async getAuthResult(): Promise<AuthResult | null> {
    let authResult = await this.vault.getSession();
    if (authResult && (await AuthConnect.isAccessTokenExpired(authResult))) {
      authResult = await this.refreshAuth(authResult);
    }
    return authResult;
  }

  private async onAuthChange(isAuthenticated: boolean): Promise<void> {
    this.ngZone.run(() => {
      this.authenticationChange.next(isAuthenticated);
    });
  }

  public async getAccessToken(): Promise<string | undefined> {
    await this.initialize();
    const res = await this.getAuthResult();
    return res?.accessToken;
  }

  public async getUserName(): Promise<string | undefined> {
    await this.initialize();
    const res = await this.getAuthResult();
    if (res) {
      const data = (await AuthConnect.decodeToken(TokenType.id, res)) as {
        name: string;
      };
      return data?.name;
    }
    return undefined;
  }

  private async saveAuthResult(authResult: AuthResult | null): Promise<void> {
    if (authResult) {
      await this.vault.setSession(authResult);
    } else {
      await this.vault.clear();
    }
    this.onAuthChange(!!authResult);
  }
}
