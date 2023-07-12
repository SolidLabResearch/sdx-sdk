import Describe = jest.Describe;

export function describeIf(envFlag: string): Describe {
  const flag = `TEST_${envFlag.toUpperCase()}`;
  const enabled = !/^(|0|false)$/iu.test(process.env[flag] ?? '');
  return enabled ? describe : describe.skip;
}
