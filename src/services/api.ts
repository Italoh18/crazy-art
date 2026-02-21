
const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const handleResponse = async (res: Response) => {
  if (res.status === 401 || res.status === 403) {
    const isLoginEndpoint = res.url.includes('/api/auth');
    if (!isLoginEndpoint) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('current_customer');
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
  async auth(payload: { code?: string, cpf?: string, email?: string, password?: string }) {
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

  async getProducts(type?: 'product' | 'service' | 'art', search?: string) {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (search) params.append('search', search);
    params.append('_t', Date.now().toString());
    
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
  async getOrder(id: string) {
    const res = await fetch(`/api/orders?id=${encodeURIComponent(id)}&_t=${Date.now()}`, { headers: getHeaders() });
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

  async createPayment(paymentData: { orderId: string, title: string, amount: number, payerEmail?: string, payerName?: string }) {
    const res = await fetch('/api/create-payment', { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify(paymentData) 
    });
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
  },

  async getTrustedCompanies() {
    const res = await fetch(`/api/trusted-companies?_t=${Date.now()}`);
    return handleResponse(res);
  },
  async addTrustedCompany(data: { name: string, imageUrl: string }) {
    const res = await fetch('/api/trusted-companies', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async deleteTrustedCompany(id: string) {
    const res = await fetch(`/api/trusted-companies?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  async getDriveFiles(folder?: string) {
    const url = folder ? `/api/files?folder=${encodeURIComponent(folder)}` : '/api/files';
    const separator = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${separator}_t=${Date.now()}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  async addDriveFile(data: any) {
    const res = await fetch('/api/files', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async deleteDriveFile(id: string) {
    const res = await fetch(`/api/files?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  async getCoupons() {
    const res = await fetch(`/api/coupons?_t=${Date.now()}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  async validateCoupon(code: string) {
    const res = await fetch(`/api/coupons?code=${encodeURIComponent(code)}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  async addCoupon(data: { code: string, percentage: number, type: string }) {
    const res = await fetch('/api/coupons', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse(res);
  },
  async deleteCoupon(id: string) {
    const res = await fetch(`/api/coupons?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
    return handleResponse(res);
  },

  async getSettings() {
    const res = await fetch(`/api/settings?_t=${Date.now()}`);
    return handleResponse(res);
  },
  async updateSetting(key: string, value: string) {
    const res = await fetch('/api/settings', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ key, value }) });
    return handleResponse(res);
  },

  // --- Auth & Verification ---
  async sendVerificationCode(userId: string, email: string, type: 'password' | 'email') {
    const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId, email, type })
    });
    return handleResponse(res);
  },

  async verifyCode(userId: string, email: string, code: string, type: 'password' | 'email') {
    const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId, email, code, type })
    });
    return handleResponse(res);
  },

  async updatePassword(id: string, password: string) {
      const res = await fetch(`/api/auth/update-password`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ id, password })
      });
      return handleResponse(res);
  },

  async updateEmail(id: string, email: string) {
      const res = await fetch(`/api/auth/update-email`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ id, email })
      });
      return handleResponse(res);
  }
};
