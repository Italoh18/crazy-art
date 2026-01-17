
const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    let errorMsg = `Erro HTTP: ${res.status}`;
    try {
      const errorData = await res.json();
      errorMsg = errorData.details || errorData.error || errorMsg;
    } catch (e) {
      // Se não for JSON, tenta pegar o texto
      const text = await res.text().catch(() => '');
      if (text) errorMsg = text;
    }
    console.error('API Error:', errorMsg);
    throw new Error(errorMsg);
  }
  
  // Garante que tentamos ler o JSON apenas uma vez
  const data = await res.json();
  return data;
};

export const api = {
  async auth(payload: { code?: string, cpf?: string }) {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await handleResponse(res);
    if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_role', data.role);
    }
    return data;
  },

  // Diagnóstico
  async forceInsert() {
    const res = await fetch('/api/force-insert');
    return handleResponse(res);
  },

  // Clientes
  async getClients() {
    const res = await fetch('/api/clients', { headers: getHeaders() });
    return handleResponse(res);
  },
  async createClient(data: any) {
    const res = await fetch('/api/clients', { 
      method: 'POST', 
      headers: getHeaders(), 
      body: JSON.stringify(data) 
    });
    return handleResponse(res);
  },
  async updateClient(id: string, data: any) {
    const res = await fetch(`/api/clients?id=${id}`, { 
      method: 'PUT', 
      headers: getHeaders(), 
      body: JSON.stringify(data) 
    });
    return handleResponse(res);
  },
  async deleteClient(id: string) {
    const res = await fetch(`/api/clients?id=${id}`, { 
      method: 'DELETE', 
      headers: getHeaders() 
    });
    return handleResponse(res);
  },

  // Produtos
  async getProducts() {
    const res = await fetch('/api/products', { headers: getHeaders() });
    return handleResponse(res);
  },
  async createProduct(data: any) {
    const res = await fetch('/api/products', { 
      method: 'POST', 
      headers: getHeaders(), 
      body: JSON.stringify(data) 
    });
    return handleResponse(res);
  },
  async deleteProduct(id: string) {
    const res = await fetch(`/api/products?id=${id}`, { 
      method: 'DELETE', 
      headers: getHeaders() 
    });
    return handleResponse(res);
  },

  // Pedidos
  async getOrders(customerId?: string) {
    const url = customerId ? `/api/orders?customerId=${customerId}` : '/api/orders';
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },
  async createOrder(data: any) {
    const res = await fetch('/api/orders', { 
      method: 'POST', 
      headers: getHeaders(), 
      body: JSON.stringify(data) 
    });
    return handleResponse(res);
  },
  async updateOrder(id: string, data: any) {
    const res = await fetch(`/api/orders?id=${id}`, { 
      method: 'PUT', 
      headers: getHeaders(), 
      body: JSON.stringify(data) 
    });
    return handleResponse(res);
  }
};
