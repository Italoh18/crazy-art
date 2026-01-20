
const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const handleResponse = async (res: Response) => {
  // Se o token for inválido (mudança de chave secreta no deploy), limpa e recarrega
  if (res.status === 401 || res.status === 403) {
    const isLoginEndpoint = res.url.includes('/api/auth');
    // Não força logout se o erro for na própria tentativa de login (senha errada)
    if (!isLoginEndpoint) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('current_customer');
        // Redireciona para home para forçar novo login
        window.location.href = '/';
        throw new Error('Sessão expirada. Faça login novamente.');
    }
  }

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
    const res = await fetch(`/api/clients?_t=${Date.now()}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  async createClient(data: any) {
    const res = await fetch('/api/clients', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async updateClient(id: string, data: any) {
    const res = await fetch(`/api/clients?id=${encodeURIComponent(id)}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async deleteClient(id: string) {
    const res = await fetch(`/api/clients?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  // Catálogo (Produtos e Serviços)
  async getProducts(type?: 'product' | 'service', search?: string) {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (search) params.append('search', search);
    params.append('_t', Date.now().toString()); // Cache buster
    
    const url = `/api/catalog?${params.toString()}`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },
  async createProduct(data: any) {
    const res = await fetch('/api/catalog', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async updateProduct(id: string, data: any) {
    const res = await fetch(`/api/catalog?id=${encodeURIComponent(id)}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async deleteProduct(id: string) {
    const res = await fetch(`/api/catalog?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  async getOrders(customerId?: string) {
    const params = new URLSearchParams();
    if (customerId) params.append('clientId', customerId);
    params.append('_t', Date.now().toString());
    
    const url = `/api/orders?${params.toString()}`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },
  async createOrder(data: any) {
    const res = await fetch('/api/orders', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async updateOrder(id: string, data: any) {
    const res = await fetch(`/api/orders?id=${encodeURIComponent(id)}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async deleteOrder(id: string) {
    const res = await fetch(`/api/orders?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  async getCarousel() {
    const res = await fetch(`/api/carousel?_t=${Date.now()}`);
    return handleResponse(res);
  },
  async addCarouselImage(url: string) {
    const res = await fetch('/api/carousel', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ url }) });
    return handleResponse(res);
  },
  async deleteCarouselImage(id: string) {
    const res = await fetch(`/api/carousel?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  }
};
