import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BrowserVault, DeviceSecurityType, Vault, VaultType} from '@ionic-enterprise/identity-vault';
import { AuthResult } from '@ionic-enterprise/auth';

const config = {
  key: 'io.ionic.gettingstartedacangular',
  type: VaultType.SecureStorage,
  deviceSecurityType: DeviceSecurityType.None,
  lockAfterBackgrounded: 5000,
  shouldClearVaultAfterTooManyFailedAttempts: true,
  customPasscodeInvalidUnlockAttempts: 2,
  unlockVaultOnLoad: false,
}

const vaultKey = 'auth-result';

@Injectable({
  providedIn: 'root'
})
export class VaultService {

  private vault: Vault | BrowserVault;

  constructor(private platform: Platform) { 
    this.vault = platform.is('hybrid') ? new Vault(config) : new BrowserVault(config);
  }

  public clear(): Promise<void> {
    return this.vault.clear();
  }

  public getSession(): Promise<AuthResult | null> {
    return this.vault.getValue<AuthResult>(vaultKey);
  }

  public setSession(value: AuthResult): Promise<void> {
    return this.vault.setValue(vaultKey, value);
  }
}
