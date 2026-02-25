export const calculateVat = (amount: number, rate: number) => {
  return amount * (rate / 100);
};

export const calculateTotalWithVat = (amount: number, rate: number) => {
  return amount + calculateVat(amount, rate);
};

export const extractVatFromTotal = (total: number, rate: number) => {
  const subtotal = total / (1 + rate / 100);
  const vatAmount = total - subtotal;
  return { subtotal, vatAmount };
};
