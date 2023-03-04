# Getting Started with Auth Connect in @ionic/angular

In this tutorial we will walk through the basic setup and use of Ionic's Auth Connect in an `@ionic/angular` application.

In this tutorial, you will learn how to:

- Install and configure Auth Connect
- Perform Login and Logout operations
- Check if the user is authenticated
- Obtain the tokens from Auth Connect
- Integrate Identity Vault with Auth Connect

:::note
The source code for the Ionic application created in this tutorial can be found [here](https://github.com/ionic-team/getting-started-ac-angular)
:::

## Generate the Application

The first step to take is to generate the application:

```bash
ionic start getting-started-ac-angular tabs --type=angular
```

Now that the application has been generated, let's also add the iOS and Android platforms.

Open the `capacitor.config.ts` file and change the `appId` to something unique like `io.ionic.gettingstartedacangular`:

```TypeScript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.gettingstartedacangular',
  appName: 'getting-started-ac-angular',
  webDir: 'www',
  bundledWebRuntime: false
};

export default config;
```

Next, build the application, then install and create the platforms:

```bash
npm run build
ionic cap add android
ionic cap add ios
```

We should do a `cap sync` with each build and ensure that our application is served on port `8100` when we run the development server. Change the scripts in `package.json` to do this:

```JSON
  "scripts": {
    ...
    "start": "ng serve --port=8100",
    "build": "ng build && cap sync",
    ...
  },
```

Finally, we're going to update our routes to better conform to what our OIDC provider requires. A typical app has a Login page with a route like `/login` and our OIDC provider expects that we do too. We will get around this by adding a blank login page, which will add `/login` as a route. We will never actually navigate to the page within our app.

```bash
ionic g page login
```

Since this page _may_ display for a short time in the OIDC provider popup tab, it is best to modify the HTML for it to only contain an `ion-content` tag. Open `src/app/login/login.page.html` and remove everything other than the empty `ion-content`.

## Install Auth Connect

In order to install Auth Connect, you will need to use `ionic enterprise register` to register your product key. This will create a `.npmrc` file containing the product key.

If you have already performed that step for your production application, you can just copy the `.npmrc` file from your production project. Since this application is for learning purposes only, you don't need to obtain another key.

You can now install Auth Connect and sync the platforms:

```bash
npm install @ionic-enterprise/auth
```

## Configure Auth Connect

Our next step is to configure Auth Connect. Create a service named `src/app/services/auth/auth.service.ts` by using `ionic g service services/auth/auth` and fill it with the following boilerplate content:

```typescript
import { Injectable } from '@angular/core';
import { ProviderOptions } from '@ionic-enterprise/auth';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
    private isNative;
    private authOptions: ProviderOptions;

    constructor(platform: Platform) {
        this.isNative = platform.is('hybrid');
        this.authOptions = {
            audience: '',
            clientId: '',
            discoveryUrl: '',
            logoutUrl: '',
            redirectUri: '',
            scope: '',
        };
    }
}
```

### Auth Connect Options

The `options` object is passed to the `login()` function when we establish the authentication session. As you can see, there are several items that we need to fill in. Specifically: `audience`, `clientId`, `scope`, `discoveryUrl`, `redirectUri`, and `logoutUrl`.

Obtaining this information likely takes a little coordination with whoever administers our backend services. In our case, we have a team that administers our Auth0 services and they have given us the following information:

- Application ID: `yLasZNUGkZ19DGEjTmAITBfGXzqbvd00`
- Audience: `https://io.ionic.demo.ac`
- Metadata Document URL: `https://dev-2uspt-sz.us.auth0.com/.well-known/openid-configuration`
- Web Redirect (for development): `http://localhost:8100/login`
- Native Redirect (for development): `msauth://login`
- Additional Scopes: `email picture profile`

Translating that into our configuration object, we now have this:

```typescript
this.authOptions = {
    audience: 'https://io.ionic.demo.ac',
    clientId: 'yLasZNUGkZ19DGEjTmAITBfGXzqbvd00',
    discoveryUrl: 'https://dev-2uspt-sz.us.auth0.com/.well-known/openid-configuration',
    logoutUrl: this.isNative ? 'msauth://login' : 'http://localhost:8100/login',
    redirectUri: this.isNative ? 'msauth://login' : 'http://localhost:8100/login',
    scope: 'openid offline_access email picture profile',
};
```

**Note:** you can use your own configuration for this tutorial as well. However, we suggest that you start with our configuration, get the application working, and then try your own configuration after that.

### Initialization

Before we can use any `AuthConnect` functions we need to make sure we have performed the initialization. Add the code to do this after the setting of the `options` value in `src/app/services/auth.service.ts`.

```typescript
import { Injectable } from '@angular/core';
import { AuthConnect, ProviderOptions } from '@ionic-enterprise/auth';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
    private initializing: Promise<void> | undefined;
    private isNative;
    private authOptions: ProviderOptions;

    constructor(private platform: Platform) {
        this.isNative = platform.is('hybrid');
        this.authOptions = {
            audience: 'https://io.ionic.demo.ac',
            clientId: 'yLasZNUGkZ19DGEjTmAITBfGXzqbvd00',
            discoveryUrl: 'https://dev-2uspt-sz.us.auth0.com/.well-known/openid-configuration',
            logoutUrl: this.isNative ? 'msauth://login' : 'http://localhost:8100/login',
            redirectUri: this.isNative ? 'msauth://login' : 'http://localhost:8100/login',
            scope: 'openid offline_access email picture profile',
        };
        this.initialize();
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
}
```

This will get Auth Connect ready to use within our application. Notice that this is also where we supply any platform specific Auth Connect options. Right now, the `logLevel` is set to `DEBUG` since this is a demo application. In a production environment, we probably would set it to `DEBUG` in development and `ERROR` in production.

The `initialize()` function will be called from several locations to ensure the setup is complete before making any further `AuthConnect` calls.

### The Provider

Auth Connect requires a provider object that specifies details pertaining to communicating with the OIDC service. Auth Connect offers several common providers out of the box: `Auth0Provider`, `AzureProvider`, `CognitoProvider`, `OktaProvider`, and `OneLoginProvider`. You can also create your own provider, though doing so is beyond the scope of this tutorial.

Since we are using Auth0, we will create an `Auth0Provider` inside `src/app/services/auth.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { Auth0Provider, AuthConnevct, ProviderOptions } from '@ionic-enterprise/auth';
import { Platform } from '@ionic/angular';
...
@Injectable({
  providedIn: 'root'
})
export class AuthService {
    private initializing: Promise<void> | undefined;
    private isNative;
    private provider = new Auth0Provider();
    ...
}
```

### Login and Logout

Login and logout are the two most fundamental operations in the authentication flow.

For the `login()`, we need to pass both the `provider` and the `options` we established above. The `login()` call resolves an `AuthResult` if the operation succeeds. The `AuthResult` contains the auth tokens as well as some other information. This object needs to be passed to almost all other Auth Connect functions. As such, it needs to be saved.

The `login()` call rejects with an error if the user cancels the login or if something else prevents the login to complete.

Add the following code to `src/app/services/auth.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { Auth0Provider, AuthConnect, AuthResult, ProviderOptions } from '@ionic-enterprise/auth';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
    private initializing: Promise<void> | undefined;
    private isNative;
    private provider = new Auth0Provider();
 ▏  private authOptions: ProviderOptions; 
    private authResult: AuthResult | null = null;

    ...
    public async login(): Promise<void> {
        await this.initialize();
        this.authResult = await AuthConnect.login(this.provider, this.authOptions);
    }
}
```

For the logout operation, we pass the `provider` and the `authResult` that was returned by the `login()` call.

```typescript
public async logout(): Promise<void> {
    await this.initialize();
    if (this.authResult) {
        await AuthConnect.logout(this.provider, this.authResult);
        this.authResult = null;
    }
}
```

To test these new function, replace the `ExploreContainer` with "Login" and "Logout" buttons in the `src/app/tab1/tab1.page.html` file. :

```html
<ion-button (click)="login()">Login</ion-button>
<ion-button (click)="logout()">Logout</ion-button>
```

Inside `src/app/tab1/tab1.page.ts`, inject our auth service, and expose the `login` and `logout` functions:

```typescript
import { Component } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  constructor(private auth: AuthService) {}

  login() {
    this.auth.login();
  }

  logout() {
    this.auth.logout();
  }

}
```

If you are using our Auth0 provider, you can use the following credentials for the test:

- Email Address: `test@ionic.io`
- Password: `Ion54321`

You should be able to login and and logout successfully.

### Configure the Native Projects

Build the application for a native device and try the login there as well. You should notice that this does not work on your device.

The problem is that we need to let the native device know which application(s) are allowed to handle navigation to the `msauth://` scheme. To do this, we need to modify our `android/app/build.gradle` and `ios/App/App/Info.plist` files <a href="https://ionic.io/docs/auth-connect/install" target="_blank">as noted here</a>. In the `Info.plist` file, use `msauth` in place of `$AUTH_URL_SCHEME`.

### Determine Current Auth Status

Right now, the user is shown both the login and logout buttons, and you don't really know if the user is logged in or not. Let's change that.

A simple strategy to use is if we have an `AuthResult` then we are logged in, otherwise we are not. Add code to do that in `src/app/services/auth.service.ts`. We are going to setup observables to notify listening pages of the change. Ignore the extra complexity with the `getAuthResult()` function. We will expand on that as we go.

We also need to be sure and trigger our `authenticationChange$` when we successfully log in or out of the application.

```typescript
import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
...
@Injectable({
  providedIn: 'root'
})
export class AuthService {
    ...
    private authenticationChange: BehaviorSubject<boolean> = new BehaviorSubject(false);
    public authenticationChange$: Observable<boolean>;

    constructor(platform: Platform, private ngZone: NgZone) {
        this.isNative = platform.is('hybrid');
        this.authOptions = { ... };
        this.initialize();
        this.authenticationChange$ = this.authenticationChange.asObservable();
        this.isAuthenticated().then( authenticated => this.onAuthChange(authenticated));
    }
    ...
    public async login(): Promise<void> {
      await this.initialize();
      this.authResult = await AuthConnect.login(this.provider, this.authOptions);
      this.onAuthChange(await this.isAuthenticated());
    }

    public async logout(): Promise<void> {
      await this.initialize();
      if (this.authResult) {
        await AuthConnect.logout(this.provider, this.authResult);
        this.authResult = null;
        this.onAuthChange(await this.isAuthenticated());
      }
    }
    ...
    private async onAuthChange(isAuthenticated: boolean): Promise<void> {
      this.ngZone.run(() => {
        this.authenticationChange.next(isAuthenticated);
      })
    }
    public async getAuthResult(): Promise<AuthResult | null> {
      return this.authResult;
    }

    public async isAuthenticated(): Promise<boolean> {
      await this.initialize();
      return !!(await this.getAuthResult());
    }
}
```

Setup Tab1Page to listen to this observable by attaching to it in the constructor:

```typescript
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';
...
export class Tab1Page {

  public authenticationChange$: Observable<boolean>;

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
```

Use this in the layout to display only the Login or the Logout button depending on the current login status:

```html
  <div *ngIf="authenticationChange$ | async; else elseBlock">
    <ion-button (click)="logout()">Logout</ion-button>
  </div>
  <ng-template #elseBlock>
    <ion-button (click)="login()">Login</ion-button>
  </ng-template>
```

At this point, you should see the Login button if you are not logged in and the Logout button if you are.

### Get the Tokens

We can now log in and out, but what about getting at the tokens that our OIDC provider gave us? This information is stored as part of the `AuthResult`. Auth Connect also includes some methods that allow us to easily look at the contents of the tokens. For example, in `src/app/services/auth.service.ts` add the following:

```typescript
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
        return data?.name ;
    }
    return undefined;
}
```

**Note:** the format and data stored in the ID token may change based on your provider and configuration. Check the documentation and configuration of your own provider for details.

You can use these wherever you need to supply a specific token. For example, if you are accessing a backend API that requires you to include a bearer token (and you probably are if you are using Auth Connect), then you can use the `getAccessToken()` method and <a href="https://github.com/ionic-team/tea-taster-vue/blob/feature/auth-connect/src/use/backend-api.ts#L15-L22" target="_blank">create in interceptor</a> that adds the token.

We don't need an interceptor for this app, but as a challenge to you, update the Tab1Page to show the current user's name when they are logged in. You could also display the access token if you want (though you would _never_ do that in a real app).

### Refreshing the Authentication

In a typical OIDC implementation, access tokens are very short lived. In such a case, it is common to use a longer lived refresh token to obtain a new `AuthResult`.

Let's add a function to `src/app/services/auth.service.ts` that does the refresh, and then modify `getAuthResult()` to call it when needed.

```typescript
public async refreshAuth(authResult: AuthResult): Promise<AuthResult | null> {
    let newAuthResult: AuthResult | null = null;
    if (await AuthConnect.isRefreshTokenAvailable(authResult)) {
        try {
            newAuthResult = await AuthConnect.refreshSession(this.provider, authResult);
        } catch (err) {
            null;
        }
    }

    return newAuthResult;
}

public async getAuthResult(): Promise<AuthResult | null> {
    if (this.authResult && (await AuthConnect.isAccessTokenExpired(this.authResult))) {
        this.authResult = await this.refreshAuth(this.authResult);
    }
    return this.authResult;
}

```

Now anything using `getAuthResult()` to get the current auth result will automatically handle a refresh if needed.

## Store the Auth Result

Up until this point, we have been storing our `AuthResult` in a local state variable in `src/app/services/auth.service.ts`. This has a couple of disadvantages:

- Our tokens could show up in a stack trace.
- Our tokens do not survive a browser refresh or application restart.

There are several options we could use to store the `AuthResult`, but one that handles persistence as well as storing the data in a secure location on native devices is Identity Vault.

For our application we will install identity vault and use it in "secure storage" mode to store the tokens. The first step is to install the product.

```bash
npm i @ionic-enterprise/identity-vault
```

Next we will create a factory that builds either the actual vault if we are on a device or a browser based "vault" that is suitable for development if we are in the browser.

```bash
ionic g service services/vault/vault
```

The following code should go in `src/app/services/vault.service.ts`.

```typescript
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
}

```

This provides us with a secure vault on our devices, or a <a href="https://ionic.io/docs/identity-vault/classes/browservault" target="_blank">fallback vault</a> that allows us to keep using our browser-based development flow.

Now that we have a factory in place to build our vaults, let's create some functions that allow us to manage our authentication result. Add the following methods to our service:

```typescript
  public clear(): Promise<void> {
    return this.vault.clear();
  }

  public getSession(): Promise<AuthResult | null> {
    return this.vault.getValue<AuthResult>(vaultKey);
  }

  public setSession(value: AuthResult): Promise<void> {
    return this.vault.setValue(vaultKey, value);
  }
```

Then modify `src/app/services/auth.service.ts` to use the `vault` service. The goal is to no longer store the auth result in a session variable. Instead, we will use the session vault to store the result and retrieve it from the vault as needed.

Remove the `private authResult: AuthResult | null = null;` line and inject your service into the `AuthService`:

```typescript
import { VaultService } from '../vault/vault.service';

constructor(platform: Platform, private ngZone: NgZone, private vault: VaultService)
```

Create a new function called `saveAuthResult()`:

```typescript
private async saveAuthResult(authResult: AuthResult | null): Promise<void> {
    if (authResult) {
        await this.vault.setSession(authResult);
    } else {
        await this.vault.clear();
    }
    this.onAuthChange(!!authResult);
}
```

Modify `refreshAuth` to save the results of an attempted refresh:

```typescript
public async refreshAuth(authResult: AuthResult): Promise<AuthResult | null> {
    let newAuthResult: AuthResult | null = null;
    if (await AuthConnect.isRefreshTokenAvailable(authResult)) {
        try {
            newAuthResult = await AuthConnect.refreshSession(this.provider, authResult);
        } catch (err) {
            null;
        }
        this.saveAuthResult(newAuthResult);
    }

    return newAuthResult;
}
```

Modify `getAuthResult()` to obtain the auth result from the vault:

```typescript
public async getAuthResult(): Promise<AuthResult | null> {
    let authResult = await this.vault.getSession();
    if (authResult && (await AuthConnect.isAccessTokenExpired(authResult))) {
        authResult = await this.refreshAuth(authResult);
    }
    
    return authResult;
}
```

Finally, modify `login()` and `logout()` to both save the results of the operation accordingly. The call to `onAuthChange()` should also be removed from each is it is now centralized in `saveAuthResult()`.

```typescript
public async login(): Promise<void> {
    await this.initialize();
    const authResult = await AuthConnect.login(this.provider, authOptions);
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
```

You should now be able to refresh the app and have a persistent session.

## Guard the Routes

Let's pretend that Tab2Page and Tab3Page had super secret information that only logged in users could see (they don't, of course, but we can pretend). We would not want users getting there if they were not currently authenticated.

We can use our `isAuthenticated()` function to build a guard for those routes.

Create a guard called `src/app/guards/auth.guard.ts` and add the following code into it:

```typescript
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    return authService.isAuthenticated()
};

```

Then add some metadata to the `tab2` and `tab3` routes inside `src/app/tabs/tabs-routing.module.ts` to indicate that they require authentication:

```typescript
      {
        path: 'tab2',
        loadChildren: () => import('../tab2/tab2.module').then(m => m.Tab2PageModule),
        canActivate: [authGuard]
      },
      {
        path: 'tab3',
        loadChildren: () => import('../tab3/tab3.module').then(m => m.Tab3PageModule),
        canActivate: [authGuard]
      },
```

Now if you are not logged in and try to click on tabs 2 or 3, the application will not navigate and you will stay on tab 1. Furthermore, if you try to manually load `http://localhost:8100/tab2` (or `tab3`), you will be redirected to `tab1`.

## Conclusion

At this point, you should have a good idea of how Auth Connect and Identity Vault work together to provide a complete and secure authentication solution. There is still more functionality that can be implemented. Be sure to check out our other documentation and demos to see how to expand on this to offer expanded functionality such as Biometric based authentication.

- <a href="https://ionic.io/docs/auth-connect" target="_blank">Auth Connect</a>
- <a href="https://ionic.io/docs/identity-vault" target="_blank">Identity Vault</a> - check out its <a href="https://ionic.io/docs/identity-vault/getting-started-angular" target="_blank">Getting Started guide</a> as well.
- <a href="https://github.com/ionic-enterprise/tea-taster-angular/tree/feature/auth-connect" target="_blank">Tea Taster with Auth Connect and Identity Vault</a>
