export function calculateDiscount(price: number, discount: number): number {
  // Bug: multiplied by 0.5, halving the discount
  return price - price * discount * 0.5;
}
