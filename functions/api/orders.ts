
import { Env, getAuth } from './_auth';
import { sendEmail, getAdminEmail, getRenderedTemplate } from '../services/email';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const clientIdParam = url.searchParams.get('clientId');

    // GET /api/orders
    if (request.method === 'GET') {
      if (id) {
        const order: any = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
        if (!order) return new Response(JSON.stringify({ error: 'Pedido não encontrado' }), { status: 404 });
        
        // Verificação de Segurança: Cliente só vê o próprio pedido
        if (user.role === 'client' && order.client_id !== user.clientId) {
          return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
        }

        const { results: items } = await env.DB.prepare(`
            SELECT id, order_id, catalog_id, name, type, unit_price, quantity, total, download_link as downloadLink 
            FROM order_items WHERE order_id = ?
        `).bind(id).all();
        
        return Response.json({
          ...order,
          items: items || [],
          formattedOrderNumber: String(order.order_number || 0).padStart(5, '0')
        });
      }

      let query = `
        SELECT o.*, c.name as client_name, c.creditLimit as client_credit_limit
        FROM orders o 
        LEFT JOIN clients c ON o.client_id = c.id
      `;
      let params: any[] = [];
      let whereClauses: string[] = [];
      
      // Se for cliente, FORÇA o filtro pelo ID dele
      if (user.role === 'client') {
        whereClauses.push('o.client_id = ?');
        params.push(user.clientId);
      } else if (clientIdParam && clientIdParam !== 'undefined') {
        // Se for admin e passou clientIdParam, filtra por ele
        whereClauses.push('o.client_id = ?');
        params.push(String(clientIdParam));
      }

      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }
      
      query += ' ORDER BY o.created_at DESC';
      
      const stmt = env.DB.prepare(query);
      const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
      
      const orders = (results || []).map((o: any) => ({
        ...o,
        formattedOrderNumber: String(o.order_number || 0).padStart(5, '0')
      }));
      
      return Response.json(orders);
    }

    // POST /api/orders
    if (request.method === 'POST') {
      const body = await request.json() as any;
      const now = new Date().toISOString();
      const newId = crypto.randomUUID();

      const { results: maxResults } = await env.DB.prepare('SELECT MAX(order_number) as last FROM orders').all();
      const lastNum = (maxResults as any)[0]?.last;
      const nextOrderNumber = (Number(lastNum) || 0) + 1;
      const formattedOrder = String(nextOrderNumber).padStart(5, '0');

      const client_idRaw = String(body.client_id || '').trim();
      // Verificação de Segurança: Cliente só cria pedido para SI MESMO
      const client_id = user.role === 'admin' ? client_idRaw : user.clientId;
      
      const description = String(body.description || '').trim();
      const order_date = String(body.order_date || body.orderDate || now.split('T')[0]);
      const due_date = String(body.due_date || body.dueDate || order_date);
      const status = String(body.status || 'open');
      const source = String(body.source || 'admin');
      const size_list = body.size_list ? String(body.size_list) : null;
      const production_step = String(body.production_step || 'production');
      const discount = Number(body.discount || 0);

      if (!client_id) return new Response(JSON.stringify({ error: 'client_id é obrigatório' }), { status: 400 });

      await env.DB.prepare(
        'INSERT INTO orders (id, order_number, client_id, description, order_date, due_date, total, total_cost, status, created_at, size_list, is_confirmed, source, production_step, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)'
      ).bind(
        newId,
        nextOrderNumber,
        client_id,
        description,
        order_date,
        due_date,
        0, 
        0, 
        status,
        now,
        size_list,
        source,
        production_step,
        discount
      ).run();

      const items = Array.isArray(body.items) ? body.items : [];
      let calculatedTotal = 0;
      let calculatedCost = 0;
      
      if (items.length > 0) {
        for (const item of items) {
          const itemId = crypto.randomUUID();
          const q = Number(item.quantity || 1);
          const p = Number(item.unitPrice || item.unit_price || item.price || 0);
          const c = Number(item.cost_price || item.costPrice || item.cost || 0);
          const subtotal = Number(item.total || (p * q));
          const dl = item.downloadLink || (item.product ? item.product.downloadLink : null);
          
          calculatedTotal += subtotal;
          calculatedCost += (c * q);

          await env.DB.prepare(
            'INSERT INTO order_items (id, order_id, catalog_id, name, type, unit_price, cost_price, quantity, total, download_link, size_list, layout_option, mold_option, art_link, art_extras_desc, wants_digital_grid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            itemId,
            newId,
            String(item.productId || item.item_id || item.catalog_id || 'manual'),
            String(item.productName || item.name || item.description || 'Item'),
            String(item.type || 'product'),
            p,
            c,
            q,
            subtotal,
            dl ? String(dl) : null,
            item.size_list ? String(item.size_list) : null,
            item.layout_option ? String(item.layout_option) : null,
            item.mold_option ? String(item.mold_option) : null,
            item.art_link ? String(item.art_link) : null,
            item.art_extras_desc ? String(item.art_extras_desc) : null,
            item.wants_digital_grid ? 1 : 0
          ).run();
        }

        await env.DB.prepare('UPDATE orders SET total = ?, total_cost = ? WHERE id = ?')
            .bind(calculatedTotal - discount, calculatedCost, newId).run();
      }

      return Response.json({ 
        success: true,
        id: newId,
        total: calculatedTotal - discount,
        order_number: nextOrderNumber,
        formattedOrderNumber: formattedOrder
      });
    }

    // PUT /api/orders?id=...
    if (request.method === 'PUT' && id) {
      const body = await request.json() as any;

      // Verificação de Segurança: Verificar se o pedido existe e pertence ao usuário (ou se é admin)
      const existingOrder: any = await env.DB.prepare('SELECT client_id FROM orders WHERE id = ?').bind(id).first();
      if (!existingOrder) return new Response(JSON.stringify({ error: 'Pedido não encontrado' }), { status: 404 });
      
      if (user.role !== 'admin' && existingOrder.client_id !== user.clientId) {
        return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
      }

      // Atalho para confirmação rápida ou status
      if (body.hasOwnProperty('is_confirmed')) {
          await env.DB.prepare('UPDATE orders SET is_confirmed = ? WHERE id = ?')
            .bind(Number(body.is_confirmed), String(id))
            .run();
          return Response.json({ success: true });
      }

      if (Object.keys(body).length === 1 && (body.status || body.production_step)) {
        let updateQuery = 'UPDATE orders SET ';
        let updateParams: any[] = [];
        let clauses: string[] = [];

        if (body.status) {
            clauses.push('status = ?');
            updateParams.push(String(body.status));
            
            if (body.status === 'paid') {
                clauses.push('paid_at = ?', 'payment_method = ?');
                updateParams.push(new Date().toISOString(), 'admin');

                // Lógica de Crédito para Pagamento Manual
                const orderInfo: any = await env.DB.prepare(`
                    SELECT o.total, o.due_date, o.client_id, o.credit_bonus_applied, o.credit_penalty_applied,
                           c.creditLimit
                    FROM orders o
                    JOIN clients c ON o.client_id = c.id
                    WHERE o.id = ?
                `).bind(id).first();

                if (orderInfo) {
                    const now = new Date();
                    const dueDate = new Date(orderInfo.due_date);
                    now.setHours(0,0,0,0);
                    dueDate.setHours(0,0,0,0);
                    const diffDays = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    let newLimit = Number(orderInfo.creditLimit || 0);
                    const orderTotal = Number(orderInfo.total || 0);
                    let bonusApplied = orderInfo.credit_bonus_applied || 0;
                    let penaltyApplied = orderInfo.credit_penalty_applied || 0;

                    if (diffDays <= 0 && !bonusApplied) {
                        newLimit += (orderTotal / 2);
                        bonusApplied = 1;
                        await env.DB.prepare("UPDATE clients SET creditLimit = ? WHERE id = ?").bind(newLimit, orderInfo.client_id).run();
                    } else if (diffDays > 15 && !penaltyApplied) {
                        newLimit = Math.max(0, newLimit - (orderTotal / 2));
                        penaltyApplied = 1;
                        await env.DB.prepare("UPDATE clients SET creditLimit = ? WHERE id = ?").bind(newLimit, orderInfo.client_id).run();
                    }

                    clauses.push('credit_bonus_applied = ?', 'credit_penalty_applied = ?');
                    updateParams.push(bonusApplied, penaltyApplied);
                }
            }

            if (body.status === 'finished') {
                clauses.push('finished_at = ?', 'finished_by_admin = 1');
                updateParams.push(new Date().toISOString());
            }
        }

        if (body.production_step) {
            clauses.push('production_step = ?');
            updateParams.push(String(body.production_step));

            // Notificação para o cliente quando entra em aprovação
            if (body.production_step === 'approval') {
                const order: any = await env.DB.prepare('SELECT order_number, client_id FROM orders WHERE id = ?').bind(id).first();
                if (order) {
                    const formattedNum = String(order.order_number).padStart(5, '0');
                    await env.DB.prepare(`
                        INSERT INTO notifications (id, target_role, user_id, type, title, message, created_at, reference_id, is_read)
                        VALUES (?, 'client', ?, 'info', 'Aguardando Aprovação', ?, ?, ?, 0)
                    `).bind(
                        crypto.randomUUID(), 
                        order.client_id, 
                        `Seu pedido #${formattedNum} está aguardando sua aprovação para seguir na produção.`, 
                        new Date().toISOString(), 
                        `approval_${id}`
                    ).run();
                }
            }
        }
        
        updateQuery += clauses.join(', ') + ' WHERE id = ?';
        updateParams.push(String(id));

        await env.DB.prepare(updateQuery).bind(...updateParams).run();
        return Response.json({ success: true });
      }

      // Edição Completa
      const description = String(body.description || '').trim();
      const order_date = String(body.order_date || body.orderDate || '');
      const due_date = String(body.due_date || body.dueDate || '');
      const status = String(body.status || 'open');
      const size_list = body.size_list ? String(body.size_list) : null;
      const discount = Number(body.discount || 0);

      // 1. Atualiza dados básicos (Sem zerar datas se vierem nulas)
      let updateOrderQuery = 'UPDATE orders SET description = ?, status = ?, size_list = ?, discount = ?';
      let updateOrderParams = [description, status, size_list, discount];

      if (order_date) {
          updateOrderQuery += ', order_date = ?';
          updateOrderParams.push(order_date);
      }
      if (due_date) {
          updateOrderQuery += ', due_date = ?';
          updateOrderParams.push(due_date);
      }

      updateOrderQuery += ' WHERE id = ?';
      updateOrderParams.push(String(id));

      await env.DB.prepare(updateOrderQuery).bind(...updateOrderParams).run();

      // 2. Se houver itens, sincroniza a tabela de itens e recalcula total
      if (Array.isArray(body.items)) {
          // Remove itens antigos
          await env.DB.prepare('DELETE FROM order_items WHERE order_id = ?').bind(String(id)).run();

          let calculatedTotal = 0;
          let calculatedCost = 0;

          for (const item of body.items) {
              const itemId = crypto.randomUUID();
              const q = Number(item.quantity || 1);
              const p = Number(item.unitPrice || item.unit_price || item.price || 0);
              const c = Number(item.cost_price || item.costPrice || item.cost || 0);
              const subtotal = Number(item.total || (p * q));
              const dl = item.downloadLink || null;

              calculatedTotal += subtotal;
              calculatedCost += (c * q);

              await env.DB.prepare(
                'INSERT INTO order_items (id, order_id, catalog_id, name, type, unit_price, cost_price, quantity, total, download_link, size_list, layout_option, mold_option, art_link, art_extras_desc, wants_digital_grid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
              ).bind(
                itemId,
                String(id),
                String(item.productId || item.item_id || item.catalog_id || 'manual'),
                String(item.productName || item.name || item.description || 'Item'),
                String(item.type || 'product'),
                p,
                c,
                q,
                subtotal,
                dl,
                item.size_list ? String(item.size_list) : null,
                item.layout_option ? String(item.layout_option) : null,
                item.mold_option ? String(item.mold_option) : null,
                item.art_link ? String(item.art_link) : null,
                item.art_extras_desc ? String(item.art_extras_desc) : null,
                item.wants_digital_grid ? 1 : 0
              ).run();
          }

          // Atualiza totais na tabela principal
          await env.DB.prepare('UPDATE orders SET total = ?, total_cost = ? WHERE id = ?')
              .bind(calculatedTotal - discount, calculatedCost, String(id)).run();
      }

      return Response.json({ success: true });
    }

    if (request.method === 'DELETE' && id) {
      if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Acesso restrito' }), { status: 403 });
      await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
      return Response.json({ success: true });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  } catch (e: any) {
    console.error("Erro na API de Pedidos:", e.message);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar pedidos.' }), { status: 500 });
  }
};
