import "../../../chunk-G42LTC7K.mjs";
class TargetResolverContext {
  constructor(ldpClient) {
    this.ldpClient = ldpClient;
  }
}
class StaticTargetResolver {
  constructor(targetUrl) {
    this.targetUrl = targetUrl;
    this.resolve = async (classIri, context) => {
      return this.target;
    };
    try {
      this.target = new URL(this.targetUrl);
    } catch {
      throw new Error("Target must be a valid URL!");
    }
  }
}
export {
  StaticTargetResolver,
  TargetResolverContext
};
