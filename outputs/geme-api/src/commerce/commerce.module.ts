import { Module } from "@nestjs/common";
import { CommerceController } from "./commerce.controller.js";
import { CommerceService } from "./commerce.service.js";
import { MediaModule } from "../media/media.module.js";
import { LoyverseService } from "../loyverse/loyverse.service.js";
import { OperationsController } from "../operations/operations.controller.js";
import { OperationsService } from "../operations/operations.service.js";
import { LoyaltyService } from "../loyalty/loyalty.service.js";

@Module({ imports: [MediaModule], controllers: [CommerceController, OperationsController], providers: [CommerceService, LoyverseService, OperationsService, LoyaltyService], exports: [CommerceService, LoyaltyService] })
export class CommerceModule {}

