import { SolidLDPContext, StaticTargetResolver } from '../src';

describe('SolidLDPContext', () => {
  it('can take a string as argument', () => {
    const context = new SolidLDPContext('https://example.com');
    expect(context.resolver).toBeInstanceOf(StaticTargetResolver);
  });

  it('can take a TargetResolver as argument', () => {
    const context = new SolidLDPContext(
      new StaticTargetResolver('https://example.com')
    );
    expect(context.resolver).toBeInstanceOf(StaticTargetResolver);
  });
});

describe('StaticTargetResolver', () => {
  it('always resolves to a set URI', async () => {
    const staticUri = new URL('http://example.com');
    const resolver = new StaticTargetResolver(staticUri.toString());
    expect((await resolver.resolve()).toString()).toEqual(staticUri.toString());
    expect((await resolver.resolve()).toString()).toEqual(staticUri.toString());
  });
});
