
const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  async auth(payload: { code?: string, cpf?: string }) {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_role', data.role);
    }
    return data;
  },

  // Clientes
  async getClients() {
    const res = await fetch('/api/clients', { headers: getHeaders() });
    return res.json();
  },
  async createClient(data: any) {
    return fetch('/api/clients', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json());
  },
  async updateClient(id: string, data: any) {
    return fetch(`/api/clients?id=${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json());
  },
  async deleteClient(id: string) {
    return fetch(`/api/clients?id=${id}`, { method: 'DELETE', headers: getHeaders() }).then(r => r.json());
  },

  // Produtos
  async getProducts() {
    const res = await fetch('/api/products', { headers: getHeaders() });
    return res.json();
  },
  async createProduct(data: any) {
    return fetch('/api/products', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json());
  },
  async deleteProduct(id: string) {
    return fetch(`/api/products?id=${id}`, { method: 'DELETE', headers: getHeaders() }).then(r => r.json());
  },

  // Pedidos
  async getOrders(customerId?: string) {
    const url = customerId ? `/api/orders?customerId=${customerId}` : '/api/orders';
    const res = await fetch(url, { headers: getHeaders() });
    return res.json();
  },
  async createOrder(data: any) {
    return fetch('/api/orders', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json());
  },
  async updateOrder(id: string, data: any) {
    return fetch(`/api/orders?id=${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json());
  }
};
