
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
    const res = await fetch(`${API_BASE_URL}/api/auth`, {
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
    const res = await fetch(`${API_BASE_URL}/api/clients?_t=${Date.now()}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  async createClient(data: any) {
    const res = await fetch(`${API_BASE_URL}/api/clients`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async updateClient(id: string, data: any) {
    const res = await fetch(`${API_BASE_URL}/api/clients?id=${encodeURIComponent(id)}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async deleteClient(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/clients?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  // Catálogo (Produtos e Serviços)
  async getProducts(type?: 'product' | 'service', search?: string) {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (search) params.append('search', search);
    params.append('_t', Date.now().toString()); // Cache buster
    
    const url = `${API_BASE_URL}/api/catalog?${params.toString()}`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },
  async createProduct(data: any) {
    const res = await fetch(`${API_BASE_URL}/api/catalog`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async updateProduct(id: string, data: any) {
    const res = await fetch(`${API_BASE_URL}/api/catalog?id=${encodeURIComponent(id)}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async deleteProduct(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/catalog?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  async getOrders(customerId?: string) {
    const params = new URLSearchParams();
    if (customerId) params.append('clientId', customerId);
    params.append('_t', Date.now().toString());
    
    const url = `${API_BASE_URL}/api/orders?${params.toString()}`;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },
  async getOrder(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/orders?id=${encodeURIComponent(id)}&_t=${Date.now()}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  async createOrder(data: any) {
    const res = await fetch(`${API_BASE_URL}/api/orders`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async updateOrder(id: string, data: any) {
    const res = await fetch(`${API_BASE_URL}/api/orders?id=${encodeURIComponent(id)}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async deleteOrder(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/orders?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  // Pagamentos - Atualizado com payer info
  async createPayment(paymentData: { orderId: string, title: string, amount: number, payerEmail?: string, payerName?: string }) {
    const res = await fetch(`${API_BASE_URL}/api/create-payment`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify(paymentData) 
    });
    return handleResponse(res);
  },

  async getCarousel() {
    const res = await fetch(`${API_BASE_URL}/api/carousel?_t=${Date.now()}`);
    return handleResponse(res);
  },
  async addCarouselImage(url: string) {
    const res = await fetch(`${API_BASE_URL}/api/carousel`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ url }) });
    return handleResponse(res);
  },
  async deleteCarouselImage(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/carousel?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  // Empresas que Confiam
  async getTrustedCompanies() {
    const res = await fetch(`${API_BASE_URL}/api/trusted-companies?_t=${Date.now()}`);
    return handleResponse(res);
  },
  async addTrustedCompany(data: { name: string, imageUrl: string }) {
    const res = await fetch(`${API_BASE_URL}/api/trusted-companies`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async deleteTrustedCompany(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/trusted-companies?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  // Drive de Artes
  async getDriveFiles(folder?: string) {
    const url = folder ? `${API_BASE_URL}/api/files?folder=${encodeURIComponent(folder)}` : `${API_BASE_URL}/api/files`;
    const separator = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${separator}_t=${Date.now()}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  async addDriveFile(data: any) {
    const res = await fetch(`${API_BASE_URL}/api/files`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async deleteDriveFile(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/files?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  // Cupons
  async getCoupons() {
    const res = await fetch(`${API_BASE_URL}/api/coupons?_t=${Date.now()}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  async validateCoupon(code: string) {
    const res = await fetch(`${API_BASE_URL}/api/coupons?code=${encodeURIComponent(code)}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  async addCoupon(data: { code: string, percentage: number, type: string }) {
    const res = await fetch(`${API_BASE_URL}/api/coupons`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async deleteCoupon(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/coupons?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  // Configurações do Site (Favicon, etc)
  async getSettings() {
    const res = await fetch(`${API_BASE_URL}/api/settings?_t=${Date.now()}`);
    return handleResponse(res);
  },
  async updateSetting(key: string, value: string) {
    const res = await fetch(`${API_BASE_URL}/api/settings`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ key, value }) });
    return handleResponse(res);
  }
};
