import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CartAvailabilityDto,
  SelectionAvailabilityQuery,
} from './dto/availability.dto';

const availabilityValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả sản phẩm' })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm thành công' })
  async getAllProducts() {
    return this.productsService.findAll();
  }

  @Get(':id/availability')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Kiểm tra khả dụng và số lượng tối đa của một sản phẩm',
  })
  @ApiParam({ name: 'id', description: 'Mã định danh sản phẩm (ví dụ: p1, p2)' })
  @ApiResponse({
    status: 200,
    description: 'Trả về thông tin khả dụng của sản phẩm.',
  })
  @ApiResponse({ status: 400, description: 'Size/topping không hợp lệ.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm.' })
  getSelectionAvailability(
    @Param('id') id: string,
    @Query(availabilityValidation) query: SelectionAvailabilityQuery,
  ) {
    return this.productsService.getSelectionAvailability(id, query);
  }

  @Post('availability')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Kiểm tra khả dụng hàng loạt cho giỏ hàng' })
  @ApiResponse({
    status: 200,
    description: 'Trả về trạng thái khả dụng của các mục trong giỏ hàng.',
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ.' })
  getCartAvailability(@Body(availabilityValidation) body: CartAvailabilityDto) {
    return this.productsService.getCartAvailability(body.items);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một sản phẩm theo ID' })
  @ApiParam({ name: 'id', description: 'Mã định danh sản phẩm (ví dụ: p1, p2)' })
  @ApiResponse({ status: 200, description: 'Thông tin chi tiết sản phẩm' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  async getProductById(@Param('id') id: string) {
    const product = await this.productsService.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }
}
