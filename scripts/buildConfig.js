const { writeFile } = require('fs');

const targetPath = 'src/config.ts';

const configFileContent = `
export const baseConfig = {
  audience: '${process.env.AUDIENCE}',
  clientId: '${process.env.CLIENT_ID}',
  discoveryUrl: '${process.env.DISCOVERY_URL}',
  scope: '${process.env.SCOPE}',
};

export const mobileConfig = {
  logoutUrl: '${process.env.LOGOUT_URL_MOBILE}',
  redirectUri: '${process.env.REDIRECT_URI_MOBILE}',
};

export const webConfig = {
  logoutUrl: '${process.env.LOGOUT_URL_WEB}',
  redirectUri: '${process.env.REDIRECT_URI_WEB}',
};
`;

writeFile(targetPath, configFileContent, function(err) {
  if (err) {
    console.log(err);
  }

  console.log(`Wrote variables to ${targetPath}`);
});
