import { StaticTargetResolver, TargetResolverContext } from "../src";
import { LdpClient } from "../src/commons";

describe("StaticTargetResolver", () => {
    it("always resolves to a set URI", async () => {
        const staticUri = new URL("http://example.com");
        const context = new TargetResolverContext(new LdpClient());
        const resolver = new StaticTargetResolver(staticUri.toString());
        expect((await resolver.resolve('http://uri1.com#ClassName1', context)).toString()).toEqual(staticUri.toString());
        expect((await resolver.resolve('http://uri2.com#somePredicate', context)).toString()).toEqual(staticUri.toString());
    });
});
