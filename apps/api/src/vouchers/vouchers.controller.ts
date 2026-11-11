import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Post,
  ServiceUnavailableException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VoucherCatalogService } from './voucher-catalog.service';
import { PublicVoucherDto } from './dto/public-voucher.dto';
import { QuoteVoucherDto } from './dto/quote-voucher.dto';
import { VoucherQuoteDto } from './dto/voucher-quote.dto';
import { VoucherCartQuoteService } from './voucher-cart-quote.service';

@ApiTags('vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(
    private readonly catalog: VoucherCatalogService,
    private readonly cartQuote: VoucherCartQuoteService,
  ) {}

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

  @Post('quote')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  @Header('Vary', 'Authorization')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  @ApiOperation({
    summary: 'Báo giá voucher theo giỏ (khách chưa đăng nhập)',
    description:
      'Đọc giá sản phẩm từ DB và phụ phí A1. Không giữ nguyên liệu/lượt dùng; quota trả null. Request có Authorization hiện trả 503 cho đến khi ghép JWT/quota, không bị coi là khách chưa đăng nhập.',
  })
  @ApiHeader({
    name: 'Authorization',
    required: false,
    description:
      'Chưa hỗ trợ đến khi tích hợp JWT/quota; gửi header này sẽ nhận 503.',
  })
  @ApiResponse({ status: 200, type: VoucherQuoteDto })
  @ApiResponse({
    status: 400,
    description:
      'Giỏ/mã không hợp lệ, món không tồn tại hoặc voucher không đủ điều kiện.',
  })
  @ApiResponse({
    status: 503,
    description:
      'Chức năng báo giá theo tài khoản đang chờ tích hợp JWT/quota.',
  })
  quote(
    @Body() dto: QuoteVoucherDto,
    @Headers('authorization') authorization?: string,
  ) {
    // Replace with Phuc's optional JWT guard + account quote after the contracts/migrations land.
    if (authorization !== undefined)
      throw new ServiceUnavailableException({
        code: 'VOUCHER_ACCOUNT_QUOTE_NOT_READY',
        message:
          'Báo giá voucher theo tài khoản chưa sẵn sàng. Vui lòng thử lại sau.',
      });
    return this.cartQuote.quoteGuest(dto);
  }
}
