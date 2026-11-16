export function todayBR(): string {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export function daysLate(dueDate?: string | null, today = todayBR()): number {
  if (!dueDate) return 0;
  const cleanDue = String(dueDate).split('T')[0];
  const cleanToday = String(today).split('T')[0];
  const dueTime = new Date(cleanDue + 'T00:00:00').getTime();
  const todayTime = new Date(cleanToday + 'T00:00:00').getTime();
  if (isNaN(dueTime) || isNaN(todayTime)) return 0;
  const diffDays = Math.round((todayTime - dueTime) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export async function getCreditUsed(env: any, clientId: string, excludeOrderId?: string): Promise<number> {
  try {
    let query = `
      SELECT SUM(CASE WHEN payment_status = 'partial' AND credit_used > 0 THEN credit_used ELSE total END) as total_used
      FROM orders
      WHERE client_id = ? 
        AND (status IN ('open', 'production', 'revision') OR payment_status = 'partial')
        AND paid_at IS NULL
        AND status != 'cancelled'
    `;
    const params: any[] = [clientId];
    if (excludeOrderId) {
      query += ` AND id != ?`;
      params.push(excludeOrderId);
    }
    const res: any = await env.DB.prepare(query).bind(...params).first();
    return Number(res?.total_used || 0);
  } catch (err) {
    try {
      let fallbackQuery = `
        SELECT SUM(total) as total_used
        FROM orders
        WHERE client_id = ?
          AND status IN ('open', 'production', 'revision')
          AND paid_at IS NULL
          AND status != 'cancelled'
      `;
      const fallbackParams: any[] = [clientId];
      if (excludeOrderId) {
        fallbackQuery += ` AND id != ?`;
        fallbackParams.push(excludeOrderId);
      }
      const fallbackRes: any = await env.DB.prepare(fallbackQuery).bind(...fallbackParams).first();
      return Number(fallbackRes?.total_used || 0);
    } catch (e) {
      return 0;
    }
  }
}

export async function hasBlockingOverdue(env: any, clientId: string, excludeOrderId?: string): Promise<boolean> {
  try {
    let query = `
      SELECT due_date
      FROM orders
      WHERE client_id = ?
        AND (status IN ('open', 'production', 'revision') OR payment_status = 'partial')
        AND paid_at IS NULL
        AND status != 'cancelled'
    `;
    const params: any[] = [clientId];
    if (excludeOrderId) {
      query += ` AND id != ?`;
      params.push(excludeOrderId);
    }
    const { results } = await env.DB.prepare(query).bind(...params).all();
    if (!results || results.length === 0) return false;

    const today = todayBR();
    for (const row of results) {
      if (daysLate(row.due_date, today) > 1) {
        return true;
      }
    }
    return false;
  } catch (err) {
    return false;
  }
}

export async function getAvailableCredit(env: any, clientId: string, excludeOrderId?: string): Promise<{ creditLimit: number, used: number, blocked: boolean, available: number }> {
  let creditLimit = 0;
  try {
    const client: any = await env.DB.prepare("SELECT creditLimit FROM clients WHERE id = ?").bind(clientId).first();
    if (client) {
      creditLimit = Number(client.creditLimit || 0);
    }
  } catch (e) {}

  const used = await getCreditUsed(env, clientId, excludeOrderId);
  const blocked = await hasBlockingOverdue(env, clientId, excludeOrderId);
  const available = blocked ? 0 : Math.max(0, creditLimit - used);

  return {
    creditLimit,
    used,
    blocked,
    available
  };
}
