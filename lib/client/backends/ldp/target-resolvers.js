"use strict";Object.defineProperty(exports, "__esModule", {value: true});require('../../../chunk-S65R2BUY.js');
class TargetResolverContext {
  constructor(ldpClient) {
    this.ldpClient = ldpClient;
  }
}
class StaticTargetResolver {
  constructor(targetUrl) {
    this.targetUrl = targetUrl;
    this.resolve = async () => this.target;
    try {
      this.target = new URL(this.targetUrl);
    } catch (e) {
      throw new Error("Target must be a valid URL!");
    }
  }
}



exports.StaticTargetResolver = StaticTargetResolver; exports.TargetResolverContext = TargetResolverContext;
