export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  /** Số ly còn bán (size S, không topping), tính từ nguyên liệu. */
  stock?: number;
}
