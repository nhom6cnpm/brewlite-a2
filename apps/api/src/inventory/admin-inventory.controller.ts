import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles';
import { InventoryOverviewDto } from './dto/inventory-overview.dto';
import { InventoryService } from './inventory.service';

/** Bảng nguyên liệu cho nhân viên (chỉ xem). */
@ApiTags('Admin Inventory')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
@ApiResponse({ status: 403, description: 'Không phải ADMIN' })
@Controller('admin/ingredients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminInventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Tồn kho nguyên liệu, phần đang giữ cho đơn và số ly còn bán',
    description:
      'Nguyên liệu chỉ đủ dưới lowStockCups ly bị đánh dấu low (sắp hết).',
  })
  @ApiResponse({ status: 200, type: InventoryOverviewDto })
  overview() {
    return this.inventory.getAdminOverview();
  }
}
