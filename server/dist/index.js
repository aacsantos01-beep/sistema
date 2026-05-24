"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./db/database");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const saleRoutes_1 = __importDefault(require("./routes/saleRoutes"));
const budgetRoutes_1 = __importDefault(require("./routes/budgetRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const sellerRoutes_1 = __importDefault(require("./routes/sellerRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve static uploads
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// Initialize database
(0, database_1.initDb)();
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/products', productRoutes_1.default);
app.use('/api/sales', saleRoutes_1.default);
app.use('/api/budgets', budgetRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/sellers', sellerRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
// Basic route
app.get('/', (req, res) => {
    res.send('TATUTECH API is running');
});
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
