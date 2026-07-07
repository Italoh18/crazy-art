
import { Env, getAuth } from './_auth';
import { sendEmail, getAdminEmail, getRenderedTemplate } from '../services/email';
import { sendPushNotification, notifyAdminsPush } from '../services/push';

export const onRequest: any = async ({ request, env }: { request: Request, env: Env }) => {
  try {
    const user = await getAuth(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const clientIdParam = url.searchParams.get('clientId');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '0'));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '1000')));
    const offset = (page - 1) * limit;
    const isPaged = url.searchParams.has('page') || url.searchParams.has('limit');

    // GET /api/orders
    if (request.method === 'GET') {
      try {
        await runCleanupIfNeeded(env);
      } catch (cleanupErr) {
        console.error("Failed to run cleanup:", cleanupErr);
      }

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

      let baseQuery = `
        FROM orders o 
        LEFT JOIN clients c ON o.client_id = c.id
      `;
      let params: any[] = [];
      let whereClauses: string[] = [];
      
      // Se for cliente, FORÇA o filtro pelo ID dele
      if (user.role === 'client') {
        whereClauses.push('o.client_id = ?');
        params.push(user.clientId);
      } else if (clientIdParam && clientIdParam !== 'undefined' && clientIdParam !== 'null') {
        // Se for admin e passou clientIdParam, filtra por ele
        whereClauses.push('o.client_id = ?');
        params.push(String(clientIdParam));
      }

      const wherePart = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';
      
      // Count total if pagination requested
      let totalCount = 0;
      if (isPaged) {
        const countQuery = `SELECT COUNT(*) as total ${baseQuery} ${wherePart}`;
        const countResult: any = params.length > 0 ? await env.DB.prepare(countQuery).bind(...params).first() : await env.DB.prepare(countQuery).first();
        totalCount = countResult?.total || 0;
      }

      let query = `
        SELECT o.*, c.name as client_name, c.creditLimit as client_credit_limit,
               (SELECT art_link FROM order_items WHERE order_id = o.id AND art_link IS NOT NULL LIMIT 1) as first_art_link
        ${baseQuery}
        ${wherePart}
        ORDER BY o.created_at DESC
      `;
      
      if (isPaged) {
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      } else {
        query += ' LIMIT 1000'; // Safety limit even if not paged
      }
      
      const stmt = env.DB.prepare(query);
      const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
      
      const orders = (results || []).map((o: any) => ({
        ...o,
        formattedOrderNumber: String(o.order_number || 0).padStart(5, '0')
      }));
      
      if (isPaged) {
        return Response.json({
          data: orders,
          total: totalCount,
          page,
          limit
        });
      }
      
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

      // Invalida o cupom se o usuário utilizou um
      const coupon_code = body.couponCode || body.coupon_code || body.coupon;
      if (coupon_code && client_id) {
          const cleanCouponCode = String(coupon_code).toUpperCase().trim();
          await env.DB.prepare(
              'UPDATE client_coupons SET is_used = 1 WHERE client_id = ? AND code = ? AND is_used = 0'
          ).bind(client_id, cleanCouponCode).run();
      }

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
          const dl = item.downloadLink || item.download_link || (item.product ? (item.product.downloadLink || item.product.download_link) : null);
          
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

        // PUSH ADMIN (Novo Pedido)
        console.log(`[Orders] Enviando push para admins sobre novo pedido #${formattedOrder}`);
        await notifyAdminsPush(env, {
            title: 'Novo Pedido',
            body: `Novo pedido #${formattedOrder} recebido!`,
            url: '/orders'
        });
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

      if (body.confirm_with_credit === true) {
          // 1. Confirmar pedido e alterar status do pagamento
          await env.DB.prepare("UPDATE orders SET is_confirmed = 1, payment_method = 'credit', payment_status = 'paid', status = 'open' WHERE id = ?")
            .bind(String(id))
            .run();
          
          // 2. Buscar informações para notificações
          const orderInfo: any = await env.DB.prepare(`
              SELECT o.*, c.name as client_name, c.email as client_email
              FROM orders o
              JOIN clients c ON o.client_id = c.id
              WHERE o.id = ?
          `).bind(id).first();

          if (orderInfo) {
              const formattedNum = String(orderInfo.order_number).padStart(5, '0');
              const nowTs = new Date().toISOString();

              // 3. Notificação In-App para Admin
              const adminNotifMsg = `Pedido #${formattedNum} finalizado usando Crédito Fidelidade por ${orderInfo.client_name}.`;
              await env.DB.prepare(`
                  INSERT INTO notifications (
                      id, target_role, type, title, message, created_at, reference_id, is_read
                  ) VALUES (?, 'admin', 'success', 'Novo Pedido em Crédito', ?, ?, ?, 0)
              `).bind(
                  crypto.randomUUID(),
                  adminNotifMsg,
                  nowTs,
                  id
              ).run();

              // 4. Push Notification para Admin
              try {
                  await notifyAdminsPush(env, {
                      title: 'Novo Pedido em Crédito',
                      body: adminNotifMsg,
                      url: '/orders'
                  });
              } catch (e) {
                  console.error('Error sending push notification to admins:', e);
              }

              // 5. Enviar e-mail de alerta para Admin
              try {
                  const emailAdmin = await getRenderedTemplate(env, 'newOrderAdmin', {
                      orderNumber: formattedNum,
                      customerName: orderInfo.client_name,
                      total: Number(orderInfo.total).toFixed(2)
                  });
                  await sendEmail(env, {
                      to: getAdminEmail(env),
                      subject: `[Crazy Art] Novo Pedido #${formattedNum} - Pago em Crédito`,
                      html: emailAdmin.html
                  });
              } catch (e) {
                  console.error('Error sending email to admin:', e);
              }
          }

          return Response.json({ success: true });
      }

      // Atalho para confirmação rápida ou status
      if (body.hasOwnProperty('is_confirmed')) {
          await env.DB.prepare('UPDATE orders SET is_confirmed = ? WHERE id = ?')
            .bind(Number(body.is_confirmed), String(id))
            .run();
          return Response.json({ success: true });
      }

      if (Object.keys(body).length <= 10 && (body.status || body.production_step || body.approval_image_url || body.change_request_desc || body.change_request_image_url || body.approval_date || body.completed_art_url)) {
        let updateQuery = 'UPDATE orders SET ';
        let updateParams: any[] = [];
        let clauses: string[] = [];

        if (body.status) {
            clauses.push('status = ?');
            updateParams.push(String(body.status));
            
            if (body.status === 'paid') {
                clauses.push('paid_at = ?', 'payment_method = ?');
                updateParams.push(new Date().toISOString(), 'admin');

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
                const order: any = await env.DB.prepare(`
                    SELECT o.order_number, o.client_id, c.name as client_name, c.email as client_email
                    FROM orders o
                    JOIN clients c ON o.client_id = c.id
                    WHERE o.id = ?
                `).bind(id).first();
                if (order) {
                    const formattedNum = String(order.order_number).padStart(5, '0');
                    const message = `Seu pedido #${formattedNum} está aguardando sua aprovação para seguir na produção.`;
                    await env.DB.prepare(`
                        INSERT INTO notifications (id, target_role, user_id, type, title, message, created_at, reference_id, is_read)
                        VALUES (?, 'client', ?, 'info', 'Aguardando Aprovação', ?, ?, ?, 0)
                    `).bind(
                        crypto.randomUUID(), 
                        order.client_id, 
                        message, 
                        new Date().toISOString(), 
                        `approval_${id}`
                    ).run();

                    // PUSH CLIENTE (Aprovação)
                    await sendPushNotification(env, order.client_id, {
                        title: 'Aguardando Aprovação',
                        body: message,
                        url: '/my-orders'
                    });

                    // EMAIL CLIENTE (Aprovação)
                    if (order.client_email) {
                        try {
                            const origin = request.headers.get('origin') || 'https://crazyart.com.br';
                            const emailContent = await getRenderedTemplate(env, 'artApprovalPending', {
                                orderNumber: formattedNum,
                                customerName: order.client_name,
                                appUrl: origin
                            });
                            await sendEmail(env, {
                                to: order.client_email,
                                subject: `[Crazy Art] Arte Disponível para Aprovação - Pedido #${formattedNum}`,
                                html: emailContent.html
                            });
                        } catch (e) {
                            console.error('Error sending email to client for art approval:', e);
                        }
                    }
                }
            } else if (body.production_step === 'completed') {
                const order: any = await env.DB.prepare(`
                    SELECT o.order_number, o.client_id, c.name as client_name, c.email as client_email
                    FROM orders o
                    JOIN clients c ON o.client_id = c.id
                    WHERE o.id = ?
                `).bind(id).first();
                if (order) {
                    const formattedNum = String(order.order_number).padStart(5, '0');
                    const message = `A arte do seu pedido #${formattedNum} foi concluída e finalizada! Já está disponível para download.`;
                    await env.DB.prepare(`
                        INSERT INTO notifications (id, target_role, user_id, type, title, message, created_at, reference_id, is_read)
                        VALUES (?, 'client', ?, 'success', 'Arte Final Concluída', ?, ?, ?, 0)
                    `).bind(
                        crypto.randomUUID(), 
                        order.client_id, 
                        message, 
                        new Date().toISOString(), 
                        `completed_${id}`
                    ).run();

                    // PUSH CLIENTE (Concluído)
                    await sendPushNotification(env, order.client_id, {
                        title: 'Arte Final Concluída',
                        body: message,
                        url: '/my-orders'
                    });

                    // EMAIL CLIENTE (Concluído)
                    if (order.client_email) {
                        try {
                            const origin = request.headers.get('origin') || 'https://crazyart.com.br';
                            const emailContent = await getRenderedTemplate(env, 'artCompleted', {
                                orderNumber: formattedNum,
                                customerName: order.client_name,
                                appUrl: origin
                            });
                            await sendEmail(env, {
                                to: order.client_email,
                                subject: `[Crazy Art] Arte Concluída e Finalizada! - Pedido #${formattedNum}`,
                                html: emailContent.html
                            });
                        } catch (e) {
                            console.error('Error sending email to client for completed art:', e);
                        }
                    }
                }
            }
        }

        if (body.approval_image_url !== undefined) {
            clauses.push('approval_image_url = ?');
            updateParams.push(body.approval_image_url);
        }
        if (body.change_request_desc !== undefined) {
            clauses.push('change_request_desc = ?');
            updateParams.push(body.change_request_desc);
        }
        if (body.change_request_image_url !== undefined) {
            clauses.push('change_request_image_url = ?');
            updateParams.push(body.change_request_image_url);
        }
        if (body.approval_date !== undefined) {
            clauses.push('approval_date = ?');
            updateParams.push(body.approval_date);
        }
        if (body.completed_art_url !== undefined) {
            clauses.push('completed_art_url = ?');
            updateParams.push(body.completed_art_url);
        }
        
        updateQuery += clauses.join(', ') + ' WHERE id = ?';
        updateParams.push(String(id));

        await env.DB.prepare(updateQuery).bind(...updateParams).run();

        if (body.status === 'paid') {
          try {
            const ordClient: any = await env.DB.prepare('SELECT client_id FROM orders WHERE id = ?').bind(id).first();
            if (ordClient && ordClient.client_id) {
              const { results: items } = await env.DB.prepare('SELECT catalog_id, name, download_link, type FROM order_items WHERE order_id = ?').bind(id).all();
              const artItems = (items || []).filter((i: any) => i.type === 'art');
              for (const art of artItems) {
                let finalDl = art.download_link;
                if (!finalDl && art.catalog_id && art.catalog_id !== 'manual') {
                  try {
                    const catalogItem: any = await env.DB.prepare('SELECT download_link FROM catalog WHERE id = ?').bind(art.catalog_id).first();
                    if (catalogItem && catalogItem.download_link) {
                      finalDl = catalogItem.download_link;
                    }
                  } catch (catalogErr) {
                    console.error("Error retrieving catalog download link:", catalogErr);
                  }
                }
                await env.DB.prepare(`
                  INSERT OR IGNORE INTO client_purchased_arts (id, client_id, art_id, art_name, download_link, purchased_at)
                  VALUES (?, ?, ?, ?, ?, ?)
                `).bind(
                  crypto.randomUUID(),
                  ordClient.client_id,
                  String(art.catalog_id || 'manual'),
                  String(art.name || 'Arte Digital'),
                  finalDl ? String(finalDl) : null,
                  new Date().toISOString()
                ).run();
              }
            }
          } catch (err: any) {
            console.warn("[OrdersAPI] Failed to insert purchased arts on admin status set to paid:", err.message);
          }
        }

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

async function runCleanupIfNeeded(env: Env) {
  try {
    const lastCleanupRow: any = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'last_file_cleanup_time'").first();
    const now = Date.now();
    const lastCleanup = lastCleanupRow ? parseInt(lastCleanupRow.value, 10) : 0;
    
    // Run cleanup at most once every 12 hours
    if (now - lastCleanup > 12 * 60 * 60 * 1000) {
      // Update last cleanup time first to prevent overlapping concurrent cleanups
      await env.DB.prepare("INSERT OR REPLACE INTO site_settings (key, value, updated_at) VALUES ('last_file_cleanup_time', ?, ?)")
        .bind(String(now), new Date().toISOString())
        .run();
        
      // Run the cleanup
      await cleanupOldFiles(env);
    }
  } catch (e) {
    console.error("Error in runCleanupIfNeeded:", e);
  }
}

async function cleanupOldFiles(env: Env) {
  try {
    const orders: any[] = await env.DB.prepare(`
      SELECT id, approval_image_url, completed_art_url 
      FROM orders 
      WHERE approval_image_url IS NOT NULL OR completed_art_url IS NOT NULL
    `).all().then((r: any) => r.results || []);

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    for (const order of orders) {
      let updateFields: string[] = [];
      let updateParams: any[] = [];

      // Check approval_image_url
      if (order.approval_image_url) {
        const ts = parseTimestampFromUrl(order.approval_image_url);
        if (ts && (now - ts > SEVEN_DAYS_MS)) {
          // Delete from bucket
          const r2Url = env.R2_PUBLIC_URL || '';
          const key = order.approval_image_url.replace(r2Url, '').replace(/^\/+/, '');
          try {
            await env.MY_BUCKET.delete(key);
            console.log(`Deleted old approval image from R2: ${key}`);
          } catch (err) {
            console.error(`Failed to delete key ${key} from R2:`, err);
          }
          updateFields.push('approval_image_url = NULL');
        }
      }

      // Check completed_art_url
      if (order.completed_art_url) {
        const ts = parseTimestampFromUrl(order.completed_art_url);
        if (ts && (now - ts > SEVEN_DAYS_MS)) {
          // Delete from bucket
          const r2Url = env.R2_PUBLIC_URL || '';
          const key = order.completed_art_url.replace(r2Url, '').replace(/^\/+/, '');
          try {
            await env.MY_BUCKET.delete(key);
            console.log(`Deleted old completed art from R2: ${key}`);
          } catch (err) {
            console.error(`Failed to delete key ${key} from R2:`, err);
          }
          updateFields.push('completed_art_url = NULL');
        }
      }

      if (updateFields.length > 0) {
        await env.DB.prepare(`
          UPDATE orders 
          SET ${updateFields.join(', ')} 
          WHERE id = ?
        `).bind(order.id).run();
      }
    }
  } catch (e) {
    console.error("Error running old files cleanup:", e);
  }
}

function parseTimestampFromUrl(url: string): number | null {
  if (!url) return null;
  const parts = url.split('/');
  const fileName = parts[parts.length - 1];
  if (!fileName) return null;
  const match = fileName.match(/^(\d+)-/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}
