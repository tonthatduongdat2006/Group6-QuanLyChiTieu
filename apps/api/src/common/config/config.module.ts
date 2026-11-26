import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, loadConfig } from './env';
import { systemClock } from '../dates/dates';

export const CLOCK = Symbol('CLOCK');

@Global()
@Module({
  providers: [
    { provide: APP_CONFIG, useFactory: () => loadConfig(process.env) },
    { provide: CLOCK, useValue: systemClock },
  ],
  exports: [APP_CONFIG, CLOCK],
})
export class ConfigModule {}
