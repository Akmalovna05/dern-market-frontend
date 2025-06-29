import express from 'express';
import morgan from 'morgan';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

// ====== Data (RAM) ======
let users = [
  {
    id: 1,
    name: "Admin",
    email: "admin@site.com",
    password: "admin123",
    isAdmin: true
  },
  {
    id: 2,
    name: "Ali Valiyev",
    email: "ali@example.com",
    password: "123456",
    isAdmin: false
  },
  {
    id: 3,
    name: "Malika Azizova",
    email: "malika@example.com",
    password: "123456",
    isAdmin: false
  }
];

let products = [
  {
    id: 101,
    name: "Sport poyabzal",
    price: 299000,
    description: "Yengil, qulay va bardoshli sport poyabzal.",
    orderedTimes: 3,
    createdAt: "2024-01-15T10:00:00Z"
  },
  {
    id: 102,
    name: "Smartfon X200",
    price: 2599000,
    description: "6.5 dyuymli ekran, 128GB xotira, 5000mAh batareya.",
    orderedTimes: 1,
    createdAt: "2024-02-10T14:30:00Z"
  },
  {
    id: 103,
    name: "Ofis stuli",
    price: 449000,
    description: "Ergonomik dizayn, harakatlanuvchi g‘ildiraklar bilan.",
    orderedTimes: 0,
    createdAt: "2024-03-01T09:00:00Z"
  }
];

let orders = [
  {
    id: 1001,
    userId: 2,
    items: [
      { productId: 101, quantity: 2 },
      { productId: 103, quantity: 1 }
    ],
    paymentMethod: "naqd",
    status: "yuborilmoqda",
    createdAt: "2024-06-15T12:45:00Z",
    statusTimestamps: {
      buyurtma_qilingan: "2024-06-15T12:45:00Z",
      yigilmoqda: "2024-06-15T13:10:00Z",
      yuborilmoqda: "2024-06-15T14:30:00Z",
      yetkazildi: null
    }
  },
  {
    id: 1002,
    userId: 3,
    items: [
      { productId: 102, quantity: 1 }
    ],
    paymentMethod: "naqd",
    status: "yetkazildi",
    createdAt: "2024-06-10T09:20:00Z",
    statusTimestamps: {
      buyurtma_qilingan: "2024-06-10T09:20:00Z",
      yigilmoqda: "2024-06-10T09:50:00Z",
      yuborilmoqda: "2024-06-10T10:30:00Z",
      yetkazildi: "2024-06-10T17:00:00Z"
    }
  }
];

// ====== Helper functions ======
const getUserByEmail = (email) => users.find(u => u.email === email);
const getUserById = (id) => users.find(u => u.id === id);

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ====== AUTH ======
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;

  // Input validation
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ message: 'Name must be a string with at least 2 characters' });
  }
  if (!email || !validateEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Password must be a string with at least 6 characters' });
  }

  if (getUserByEmail(email)) {
    return res.status(400).json({ message: 'Email already exists' });
  }

  const newUser = {
    id: Date.now(),
    name: name.trim(),
    email: email.toLowerCase(),
    password,
    isAdmin: false
  };

  users.push(newUser);
  res.status(201).json({ message: 'Registered successfully', user: newUser });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Input validation
  if (!email || !validateEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ message: 'Password must be a string' });
  }

  const user = getUserByEmail(email.toLowerCase());
  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  res.json({ message: 'Login successful', user });
});

// ====== PRODUCTS ======
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const { userId, name, price, description } = req.body;

  // Input validation
  const user = getUserById(userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Only admin can add products' });
  }
  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    return res.status(400).json({ message: 'Name must be a string with at least 3 characters' });
  }
  if (!price || typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ message: 'Price must be a positive number' });
  }
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return res.status(400).json({ message: 'Description must be a string with at least 10 characters' });
  }

  const newProduct = {
    id: Date.now(),
    name: name.trim(),
    price,
    description: description.trim(),
    orderedTimes: 0,
    createdAt: new Date().toISOString()
  };

  products.push(newProduct);
  res.status(201).json({ message: 'Product added', product: newProduct });
});

app.put('/api/products/:id', (req, res) => {
  const { userId, name, price, description } = req.body;

  // Input validation
  const user = getUserById(userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Only admin can update products' });
  }
  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    return res.status(400).json({ message: 'Name must be a string with at least 3 characters' });
  }
  if (!price || typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ message: 'Price must be a positive number' });
  }
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return res.status(400).json({ message: 'Description must be a string with at least 10 characters' });
  }

  const product = products.find(p => p.id == req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  product.name = name.trim();
  product.price = price;
  product.description = description.trim();
  res.json({ message: 'Product updated', product });
});

app.delete('/api/products/:id', (req, res) => {
  const { userId } = req.body;

  // Input validation
  const user = getUserById(userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Only admin can delete products' });
  }
  const productIndex = products.findIndex(p => p.id == req.params.id);
  if (productIndex === -1) {
    return res.status(404).json({ message: 'Product not found' });
  }

  products.splice(productIndex, 1);
  res.json({ message: 'Product deleted' });
});

// ====== ORDERS ======
app.post('/api/order', (req, res) => {
  const { userId, items, paymentMethod } = req.body;

  // Input validation
  const user = getUserById(userId);
  if (!user) return res.status(401).json({ message: 'Login required' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Items must be a non-empty array' });
  }
  if (!paymentMethod || !['naqd', 'karta'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Payment method must be either "naqd" or "karta"' });
  }

  for (const item of items) {
    if (!item.productId || typeof item.productId !== 'number') {
      return res.status(400).json({ message: 'Each item must have a valid productId' });
    }
    if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
      return res.status(400).json({ message: 'Each item must have a positive quantity' });
    }
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(404).json({ message: `Product with ID ${item.productId} not found` });
    }
  }

  const newOrder = {
    id: Date.now(),
    userId: user.id,
    items,
    paymentMethod,
    status: 'buyurtma_qilingan',
    createdAt: new Date().toISOString(),
    statusTimestamps: {
      buyurtma_qilingan: new Date().toISOString(),
      yigilmoqda: null,
      yuborilmoqda: null,
      yetkazildi: null
    }
  };

  orders.push(newOrder);

  // Update orderedTimes
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (product) product.orderedTimes += item.quantity;
  }

  res.status(201).json({ message: 'Order placed', order: newOrder });
});

app.get('/api/orders', (req, res) => {
  const { userId } = req.query;

  // Input validation
  if (!userId || isNaN(Number(userId))) {
    return res.status(400).json({ message: 'Valid userId is required' });
  }

  const user = getUserById(Number(userId));
  if (!user) return res.status(401).json({ message: 'Login required' });

  const userOrders = orders.filter(o => o.userId === user.id);
  res.json(userOrders);
});

app.get('/api/admin/orders', (req, res) => {
  const { userId } = req.query;

  // Input validation
  if (!userId || isNaN(Number(userId))) {
    return res.status(400).json({ message: 'Valid userId is required' });
  }

  const user = getUserById(Number(userId));
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Only admin can view all orders' });
  }

  res.json(orders);
});

app.patch('/api/orders/:id', (req, res) => {
  const { userId, newStatus } = req.body;

  // Input validation
  if (!userId || isNaN(Number(userId))) {
    return res.status(400).json({ message: 'Valid userId is required' });
  }
  if (!newStatus || !['buyurtma_qilingan', 'yigilmoqda', 'yuborilmoqda', 'yetkazildi'].includes(newStatus)) {
    return res.status(400).json({ message: 'Invalid status. Must be one of: buyurtma_qilingan, yigilmoqda, yuborilmoqda, yetkazildi' });
  }

  const user = getUserById(userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Only admin can update order status' });
  }

  const order = orders.find(o => o.id == req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  order.status = newStatus;
  order.statusTimestamps[newStatus] = new Date().toISOString();
  res.json({ message: 'Order status updated', order });
});

// ====== ADMIN STATS ======
app.get('/api/admin/stats', (req, res) => {
  const { userId } = req.query;

  // Input validation
  if (!userId || isNaN(Number(userId))) {
    return res.status(400).json({ message: 'Valid userId is required' });
  }

  const user = getUserById(Number(userId));
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Only admin can view stats' });
  }

  // Calculate total sales
  const totalSales = orders.reduce((sum, order) => {
    const orderTotal = order.items.reduce((itemSum, item) => {
      const product = products.find(p => p.id === item.productId);
      return product ? itemSum + product.price * item.quantity : itemSum;
    }, 0);
    return sum + orderTotal;
  }, 0);

  // Get top products by orderedTimes
  const topProducts = products
    .sort((a, b) => b.orderedTimes - a.orderedTimes)
    .slice(0, 3) // Top 3 products
    .map(({ name, orderedTimes }) => ({ name, orderedTimes }));

  // Count orders by status
  const ordersByStatus = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {
    buyurtma_qilingan: 0,
    yigilmoqda: 0,
    yuborilmoqda: 0,
    yetkazildi: 0
  });

  res.json({
    totalSales,
    topProducts,
    ordersByStatus
  });
});

app.get("/hello", (req, res) => {
  res.status(200).send("Hello world!");
});

app.use((req, res, next, error) => {
  console.error(error);
  res.status(500).send("Ichki server xatosi");
});

// ====== Server Start ======
app.listen(PORT, () => {
  console.log(`Server ishga tushirildi: http://localhost:${PORT}`);
});
