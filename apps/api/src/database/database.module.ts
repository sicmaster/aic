import { Module } from '@nestjs/common';
import { databasePoolProvider, databaseProvider } from './database.provider';

@Module({
  providers: [databasePoolProvider, databaseProvider],
  exports: [databasePoolProvider, databaseProvider],
})
export class DatabaseModule {}
