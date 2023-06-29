
export const baseConfig = {
  audience: 'https://io.ionic.demo.ac',
  clientId: 'yLasZNUGkZ19DGEjTmAITBfGXzqbvd00',
  discoveryUrl: 'https://dev-2uspt-sz.us.auth0.com/.well-known/openid-configuration',
  scope: 'openid',
};

export const mobileConfig = {
  logoutUrl: 'msauth://login',
  redirectUri: 'msauth://login',
};

export const webConfig = {
  logoutUrl: 'http://localhost:8100/login',
  redirectUri: 'http://localhost:8100/login',
};
