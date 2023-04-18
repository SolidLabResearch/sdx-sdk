import { LogLevel } from 'typescript-logging';
import { CategoryProvider } from 'typescript-logging-category-style';

const provider = CategoryProvider.createProvider('MainProvider', {
  level: LogLevel.Debug
});

/* Create some root categories for this example, you can also expose getLogger() from the provider instead e.g. */
export const perfLogger = provider.getCategory('performance');
