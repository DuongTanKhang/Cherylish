import { Module } from "@nestjs/common";
import { ViettelPostController } from "./viettel-post.controller.js";
import { ViettelPostService } from "./viettel-post.service.js";

@Module({
  controllers: [ViettelPostController],
  providers: [ViettelPostService],
})
export class ViettelPostModule {}
