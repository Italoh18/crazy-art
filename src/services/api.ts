
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
      const text = await res.text().catch(() => '');
      if (text) errorMsg = text;
    }
    throw new Error(errorMsg);
  }
  return res.json();
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

  async getClients() {
    const res = await fetch('/api/clients', { headers: getHeaders() });
    return handleResponse(res);
  },
  async createClient(data: any) {
    const res = await fetch('/api/clients', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async updateClient(id: string, data: any) {
    const res = await fetch(`/api/clients?id=${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async deleteClient(id: string) {
    const res = await fetch(`/api/clients?id=${id}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  // Catálogo (Produtos e Serviços)
  async getProducts(type?: 'product' | 'service', search?: string) {
    let url = '/api/catalog';
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (search) params.append('search', search);
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },
  async createProduct(data: any) {
    const res = await fetch('/api/catalog', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async deleteProduct(id: string) {
    const res = await fetch(`/api/catalog?id=${id}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  async getOrders(customerId?: string) {
    const url = customerId ? `/api/orders?clientId=${customerId}` : '/api/orders';
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },
  async createOrder(data: any) {
    const res = await fetch('/api/orders', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async updateOrder(id: string, data: any) {
    const res = await fetch(`/api/orders?id=${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },

  async getCarousel() {
    const res = await fetch('/api/carousel');
    return handleResponse(res);
  },
  async addCarouselImage(url: string) {
    const res = await fetch('/api/carousel', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ url }) });
    return handleResponse(res);
  },
  async deleteCarouselImage(id: string) {
    const res = await fetch(`/api/carousel?id=${id}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  }
};
