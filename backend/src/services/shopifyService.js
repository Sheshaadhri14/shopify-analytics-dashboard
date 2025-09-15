const axios = require('axios');

class ShopifyService {
  constructor(storeDomain, accessToken) {
    this.storeDomain = storeDomain;
    this.accessToken = accessToken;
    this.baseUrl = `https://${storeDomain}/admin/api/2023-10`;
  }

  async makeRequest(endpoint, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔄 Request → ${this.baseUrl}${endpoint}`);
        
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: { 'X-Shopify-Access-Token': this.accessToken },
          timeout: 30000
        });
        
        return response.data;
      } catch (error) {
        const status = error.response?.status;
        console.error(`❌ Shopify API Error (attempt ${i + 1}):`, {
          status,
          data: error.response?.data,
          message: error.message
        });

        // Retry logic
        if ((status === 429 || status >= 500) && i < retries - 1) {
          const waitTime = Math.pow(2, i) * 1000;
          console.log(`⏳ Backoff: waiting ${waitTime}ms...`);
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }
        throw error;
      }
    }
  }

  // Cursor-based pagination
  async paginate(endpoint) {
    let results = [];
    let url = `${endpoint}&limit=250`;

    while (url) {
      const response = await axios.get(`${this.baseUrl}${url}`, {
        headers: { 'X-Shopify-Access-Token': this.accessToken }
      });

      results = results.concat(Object.values(response.data)[0]); // extract array (customers/products/orders)

      const linkHeader = response.headers['link'];
      const nextMatch = linkHeader?.match(/<([^>]+)>; rel="next"/);
      url = nextMatch ? nextMatch[1].replace(this.baseUrl, '') : null;
    }
    return results;
  }
async createCustomer(customer) {
  return axios.post(`${this.baseUrl}/customers.json`, { customer }, {
    headers: { "X-Shopify-Access-Token": this.accessToken },
  });
}

async createProduct(product) {
  return axios.post(`${this.baseUrl}/products.json`, { product }, {
    headers: { "X-Shopify-Access-Token": this.accessToken },
  });
}

async createOrder(order) {
  return axios.post(`${this.baseUrl}/orders.json`, { order }, {
    headers: { "X-Shopify-Access-Token": this.accessToken },
  });
}

  async getCustomers() {
    return this.paginate('/customers.json?');
  }

  async getProducts() {
    return this.paginate('/products.json?');
  }

  async getOrders() {
    return this.paginate('/orders.json?status=any&');
  }

  async testConnection() {
    try {
      const shop = await this.makeRequest('/shop.json');
      return { success: true, shopName: shop.shop.name, domain: shop.shop.domain };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = ShopifyService;
