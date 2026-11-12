import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VoucherCatalogService } from './voucher-catalog.service';
import { PublicVoucherDto } from './dto/public-voucher.dto';
import { QuoteVoucherDto } from './dto/quote-voucher.dto';
import { VoucherQuoteDto } from './dto/voucher-quote.dto';
import { VoucherCartQuoteService } from './voucher-cart-quote.service';
import { OptionalVoucherAuthGuard } from './optional-voucher-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

// Keep the original body intact until this route's explicit DTO pipe runs;
// main's global whitelist would otherwise strip unknown keys before rejection.
type VoucherQuoteBody = Pick<QuoteVoucherDto, keyof QuoteVoucherDto>;

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
  @UseGuards(OptionalVoucherAuthGuard)
  @UsePipes(
    new ValidationPipe({
      expectedType: QuoteVoucherDto,
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  @ApiOperation({
    summary: 'Báo giá voucher theo giỏ và lượt dùng của tài khoản',
    description:
      'Không có token: báo giá khách, usage null. Có JWT hợp lệ: kiểm tra tối đa 3 lượt/mã theo tài khoản. Token sai/hết hạn: 401. Chỉ báo giá, không giữ nguyên liệu hoặc lượt voucher.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: QuoteVoucherDto })
  @ApiResponse({ status: 200, type: VoucherQuoteDto })
  @ApiResponse({
    status: 400,
    description:
      'Giỏ/mã không hợp lệ, món không tồn tại hoặc voucher không đủ điều kiện.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token sai/hết hạn hoặc tài khoản không còn hợp lệ.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Đã hết lượt mã hoặc các lượt còn lại đang giữ cho đơn chờ thanh toán.',
  })
  quote(
    @Body() dto: VoucherQuoteBody,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.cartQuote.quote(dto, request.user?.userId);
  }
}
