import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryProvisioner } from './category-provisioner.service';

@Module({ controllers: [CategoryController], providers: [CategoryProvisioner], exports: [CategoryProvisioner] })
export class CategoryModule {}
