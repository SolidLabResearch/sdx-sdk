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
      try {
        const target = new URL(this.targetUrl);
        return target;
      } catch {
        throw new Error("Target must be a valid URL!");
      }
    };
    console.log("YES");
  }
}
export {
  StaticTargetResolver,
  TargetResolverContext
};
