import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VoucherCatalogService } from './voucher-catalog.service';
import { PublicVoucherDto } from './dto/public-voucher.dto';

@ApiTags('vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly catalog: VoucherCatalogService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Danh sách voucher công khai còn hiệu lực' })
  @ApiResponse({ status: 200, type: PublicVoucherDto, isArray: true })
  @ApiResponse({
    status: 500,
    description: 'Không truy cập được dữ liệu voucher',
  })
  list() {
    return this.catalog.list();
  }
}
