<?php
require_once __DIR__ . '/config/database.php';

// Simulação simples de roteamento
$requestUri = $_SERVER['REQUEST_URI'];
$basePath = '/api'; // Ajuste conforme necessário na Hostinger

$path = str_replace($basePath, '', $requestUri);
$path = explode('?', $path)[0];
$path = rtrim($path, '/');

$method = $_SERVER['REQUEST_METHOD'];

// Helper para pegar IDs de rotas como /products/1
$pathParts = explode('/', ltrim($path, '/'));
$resourceId = (count($pathParts) > 1 && is_numeric($pathParts[1])) ? $pathParts[1] : null;

switch (true) {
    // AUTH
    case ($path === '/auth/login' && $method === 'POST'):
        require_once __DIR__ . '/controllers/AuthController.php';
        (new AuthController($pdo))->login();
        break;

    // DASHBOARD
    case ($path === '/dashboard/stats' && $method === 'GET'):
        require_once __DIR__ . '/controllers/DashboardController.php';
        (new DashboardController($pdo))->getStats();
        break;

    // USERS
    case ($path === '/users' && $method === 'GET'):
        require_once __DIR__ . '/controllers/UserController.php';
        (new UserController($pdo))->getAll();
        break;
    case ($path === '/users' && $method === 'POST'):
        require_once __DIR__ . '/controllers/UserController.php';
        (new UserController($pdo))->create();
        break;
    case (preg_match('/^\/users\/\d+$/', $path) && $method === 'PUT'):
        require_once __DIR__ . '/controllers/UserController.php';
        (new UserController($pdo))->update($resourceId);
        break;
    case (preg_match('/^\/users\/\d+$/', $path) && $method === 'DELETE'):
        require_once __DIR__ . '/controllers/UserController.php';
        (new UserController($pdo))->delete($resourceId);
        break;

    // PRODUCTS
    case ($path === '/products' && $method === 'GET'):
        require_once __DIR__ . '/controllers/ProductController.php';
        (new ProductController($pdo))->getAll();
        break;
    case ($path === '/products' && $method === 'POST'):
        require_once __DIR__ . '/controllers/ProductController.php';
        (new ProductController($pdo))->create();
        break;
    case (preg_match('/^\/products\/\d+$/', $path) && $method === 'POST'):
        require_once __DIR__ . '/controllers/ProductController.php';
        (new ProductController($pdo))->update($resourceId);
        break;
    case (preg_match('/^\/products\/\d+$/', $path) && $method === 'DELETE'):
        require_once __DIR__ . '/controllers/ProductController.php';
        (new ProductController($pdo))->delete($resourceId);
        break;

    // SALES
    case ($path === '/sales' && $method === 'GET'):
        require_once __DIR__ . '/controllers/SaleController.php';
        (new SaleController($pdo))->getAll();
        break;
    case (preg_match('/^\/sales\/report\/(\d+)\/(\d+)$/', $path, $matches) && $method === 'GET'):
        require_once __DIR__ . '/controllers/SaleController.php';
        (new SaleController($pdo))->getMonthlyReport($matches[1], $matches[2]);
        break;
    case ($path === '/sales' && $method === 'POST'):
        require_once __DIR__ . '/controllers/SaleController.php';
        (new SaleController($pdo))->create();
        break;

    // SELLERS
    case ($path === '/sellers' && $method === 'GET'):
        require_once __DIR__ . '/controllers/SellerController.php';
        (new SellerController($pdo))->getAll();
        break;
    case ($path === '/sellers' && $method === 'POST'):
        require_once __DIR__ . '/controllers/SellerController.php';
        (new SellerController($pdo))->create();
        break;
    case (preg_match('/^\/sellers\/\d+$/', $path) && $method === 'PUT'):
        require_once __DIR__ . '/controllers/SellerController.php';
        (new SellerController($pdo))->update($resourceId);
        break;
    case (preg_match('/^\/sellers\/\d+$/', $path) && $method === 'DELETE'):
        require_once __DIR__ . '/controllers/SellerController.php';
        (new SellerController($pdo))->delete($resourceId);
        break;

    // BUDGETS
    case ($path === '/budgets' && $method === 'GET'):
        require_once __DIR__ . '/controllers/BudgetController.php';
        (new BudgetController($pdo))->getAll();
        break;
    case ($path === '/budgets' && $method === 'POST'):
        require_once __DIR__ . '/controllers/BudgetController.php';
        (new BudgetController($pdo))->create();
        break;
    case (preg_match('/^\/budgets\/(\d+)\/status$/', $path, $matches) && $method === 'PUT'):
        require_once __DIR__ . '/controllers/BudgetController.php';
        (new BudgetController($pdo))->updateStatus($matches[1]);
        break;
    case (preg_match('/^\/budgets\/\d+$/', $path) && $method === 'GET'):
        require_once __DIR__ . '/controllers/BudgetController.php';
        (new BudgetController($pdo))->getDetails($resourceId);
        break;

    // PAYABLES
    case ($path === '/payables' && $method === 'GET'):
        require_once __DIR__ . '/controllers/PayableController.php';
        (new PayableController($pdo))->getAll();
        break;
    case ($path === '/payables' && $method === 'POST'):
        require_once __DIR__ . '/controllers/PayableController.php';
        (new PayableController($pdo))->create();
        break;
    case (preg_match('/^\/payables\/\d+$/', $path) && $method === 'PUT'):
        require_once __DIR__ . '/controllers/PayableController.php';
        (new PayableController($pdo))->update($resourceId);
        break;
    case (preg_match('/^\/payables\/\d+$/', $path) && $method === 'DELETE'):
        require_once __DIR__ . '/controllers/PayableController.php';
        (new PayableController($pdo))->delete($resourceId);
        break;

    default:
        http_response_code(404);
        echo json_encode(["message" => "Rota não encontrada", "path" => $path]);
        break;
}
