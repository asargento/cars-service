'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Root package.json has "type": "module", so Node walks up from
 * `.esbuild/.build/src/handlers/*.js` and treats the bundle as ESM. The CJS
 * output from esbuild then breaks under `require()` (osls invoke local).
 * A `package.json` in the build root stops the walk and scopes the bundle as CJS.
 */
class LambdaCjsBuildScope {
  constructor(serverless) {
    this.serverless = serverless;
    this.hooks = {
      'before:package:createDeploymentArtifacts': async () => this.writeBuildPackageJson(),
      'before:invoke:local:invoke': async () => this.writeBuildPackageJson(),
    };
  }

  writeBuildPackageJson() {
    const serviceDir = this.serverless.config.serviceDir || this.serverless.config.servicePath;
    const buildDir = path.join(serviceDir, '.esbuild', '.build');
    if (!fs.existsSync(buildDir)) return;
    const pkgPath = path.join(buildDir, 'package.json');
    fs.writeFileSync(pkgPath, `${JSON.stringify({ type: 'commonjs' })}\n`, 'utf8');
  }
}

module.exports = LambdaCjsBuildScope;
