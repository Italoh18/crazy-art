import { Order } from '../../types';

/**
 * Verifica se um pedido está 100% quitado / pago.
 * Pedidos com pagamento parcial ou em crédito aberto NÃO são considerados pagos.
 */
export const isOrderPaid = (o: Partial<Order> | any): boolean => {
  if (!o || o.status === 'cancelled') return false;
  
  // Se estiver explicitamente finalizado ou pago
  if (o.status === 'paid' || o.status === 'finished') return true;

  // Se o pagamento for parcial (ex: parte paga no cartão e parte no crédito), NÃO está 100% pago
  if (o.payment_status === 'partial') return false;

  // Se é método crédito ou tem saldo de crédito a pagar e o pedido ainda está em aberto/produção/revisão
  if (o.payment_method === 'credit' && ['open', 'production', 'revision'].includes(o.status)) return false;
  if (o.credit_used && Number(o.credit_used) > 0 && ['open', 'production', 'revision'].includes(o.status) && !o.paid_at) return false;

  // Se possui marcação de paid_at e o status não é open/aberto
  if (o.paid_at && !['open', 'production', 'revision'].includes(o.status)) return true;

  return false;
};

/**
 * Verifica se a data de vencimento do pedido já expirou.
 * Garante que o vencimento seja tolerante ao dia corrente (expira apenas após 23:59:59 da data local).
 */
export const isOrderOverdue = (dueDateStr?: string | null): boolean => {
  if (!dueDateStr) return false;
  const cleanDate = String(dueDateStr).split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length !== 3) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

  const due = new Date(year, month, day, 23, 59, 59, 999);
  return due.getTime() < Date.now();
};

/**
 * Retorna o valor restante que ainda falta pagar em um pedido.
 * Se o pedido já estiver quitado, retorna 0.
 * Se houve pagamento parcial online e o restante ficou no crédito, retorna o saldo do crédito.
 * Se é pedido a prazo/crédito integral ou em aberto, retorna o total do pedido.
 */
export const getOrderRemainingAmount = (o: Partial<Order> | any): number => {
  if (!o || isOrderPaid(o)) return 0;
  const total = Number(o.total || 0);

  // Se o pagamento é parcial (entrada paga via online e restante em crédito fidelidade)
  if (o.payment_status === 'partial' && o.credit_used && Number(o.credit_used) > 0) {
    return Number(o.credit_used);
  }

  // Se foi pago parte do valor mas o status é open e temos credit_used
  if (o.credit_used && Number(o.credit_used) > 0 && o.payment_method === 'mercadopago+credit') {
    return Number(o.credit_used);
  }

  return total;
};
