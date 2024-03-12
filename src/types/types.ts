export interface Order {
    order_id: number,
    owner_address: string;
    price: number;
    size: number;
    is_buy: boolean;
}