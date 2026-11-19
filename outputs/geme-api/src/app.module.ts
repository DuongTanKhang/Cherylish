import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountModule } from "./account/account.module.js";
import { HealthModule } from "./health/health.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { MaterialsModule } from "./materials/materials.module.js";
import { CommerceModule } from "./commerce/commerce.module.js";
import { ViettelPostModule } from "./viettel-post/viettel-post.module.js";
import { AdminAuthModule } from "./admin-auth/admin-auth.module.js";
import { AdminCalendarModule } from "./admin-calendar/admin-calendar.module.js";
import { GmailModule } from "./gmail/gmail.module.js";
import { MarketingModule } from "./marketing/marketing.module.js";
import { SocialModule } from "./social/social.module.js";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AdminAuthModule, AdminCalendarModule, GmailModule, MarketingModule, SocialModule, HealthModule, MaterialsModule, CommerceModule, AccountModule, ViettelPostModule],
})
export class AppModule {}
