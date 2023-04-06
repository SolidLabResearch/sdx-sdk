"use strict";Object.defineProperty(exports, "__esModule", {value: true});require('../../../chunk-S65R2BUY.js');
class TargetResolverContext {
  constructor(ldpClient) {
    this.ldpClient = ldpClient;
  }
}
class StaticTargetResolver {
  constructor(targetUrl) {
    this.targetUrl = targetUrl;
    this.resolve = async (classIri, context) => {
      try {
        const target = new URL(this.targetUrl);
        return target;
      } catch (e) {
        throw new Error("Target must be a valid URL!");
      }
    };
    console.log("YES");
  }
}



exports.StaticTargetResolver = StaticTargetResolver; exports.TargetResolverContext = TargetResolverContext;
