import { SolidLDPContext, StaticTargetResolver, TargetResolverContext } from "../src";
import { LdpClient } from "../src/commons";


describe('SolidLDPContext', () => {
    it('can take a string as argument', () => {
        const context = new SolidLDPContext('https://example.com');
        expect(context.resolver).toBeInstanceOf(StaticTargetResolver);
    });

    it('can take a TargetResolver as argument', () => {
        const context = new SolidLDPContext(new StaticTargetResolver('https://example.com'));
        expect(context.resolver).toBeInstanceOf(StaticTargetResolver);
    });
});

describe("StaticTargetResolver", () => {
    it("always resolves to a set URI", async () => {
        const staticUri = new URL("http://example.com");
        const context = new TargetResolverContext(new LdpClient());
        const resolver = new StaticTargetResolver(staticUri.toString());
        expect((await resolver.resolve('http://uri1.com#ClassName1', context)).toString()).toEqual(staticUri.toString());
        expect((await resolver.resolve('http://uri2.com#somePredicate', context)).toString()).toEqual(staticUri.toString());
    });
});
