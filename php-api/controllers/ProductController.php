<?php
require_once __DIR__ . '/../middleware/auth.php';

class ProductController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getAll() {
        authenticate();
        $stmt = $this->pdo->query("SELECT * FROM products ORDER BY id DESC");
        echo json_encode($stmt->fetchAll());
    }

    public function getById($id) {
        authenticate();
        $stmt = $this->pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $product = $stmt->fetch();
        
        if (!$product) {
            http_response_code(404);
            echo json_encode(["message" => "Produto não encontrado"]);
            return;
        }
        echo json_encode($product);
    }

    public function create() {
        authenticate();
        
        $sku = $_POST['sku'] ?? null;
        $name = $_POST['name'] ?? null;
        $category = $_POST['category'] ?? null;
        $supplier = $_POST['supplier'] ?? null;
        $price = $_POST['price'] ?? 0;
        $stock = $_POST['stock'] ?? 0;
        $image_url = null;

        if (isset($_FILES['image'])) {
            $uploadDir = __DIR__ . '/../../uploads/products/';
            if (!file_exists($uploadDir)) mkdir($uploadDir, 0777, true);
            
            $filename = time() . '-' . basename($_FILES['image']['name']);
            $targetPath = $uploadDir . $filename;
            
            if (move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
                $image_url = '/uploads/products/' . $filename;
            }
        }

        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO products (sku, name, category, supplier, price, stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$sku, $name, $category, $supplier, $price, $stock, $image_url]);
            
            http_response_code(201);
            echo json_encode(["id" => $this->pdo->lastInsertId(), "message" => "Produto criado com sucesso"]);
        } catch (PDOException $e) {
            if ($e->getCode() == '23000') {
                http_response_code(400);
                echo json_encode(["message" => "SKU já existe"]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Erro ao criar produto: " . $e->getMessage()]);
            }
        }
    }

    public function update($id) {
        authenticate();
        
        // PHP não popula $_POST em requisições PUT por padrão. 
        // Para simplificar a migração na Hostinger, usaremos POST com um campo extra ou leremos o input bruto.
        $sku = $_POST['sku'] ?? null;
        $name = $_POST['name'] ?? null;
        $category = $_POST['category'] ?? null;
        $supplier = $_POST['supplier'] ?? null;
        $price = $_POST['price'] ?? 0;
        $stock = $_POST['stock'] ?? 0;
        $image_url = $_POST['image_url'] ?? null;

        if (isset($_FILES['image'])) {
            $uploadDir = __DIR__ . '/../../uploads/products/';
            $filename = time() . '-' . basename($_FILES['image']['name']);
            $targetPath = $uploadDir . $filename;
            
            if (move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
                $image_url = '/uploads/products/' . $filename;
            }
        }

        try {
            $stmt = $this->pdo->prepare(
                'UPDATE products SET sku = ?, name = ?, category = ?, supplier = ?, price = ?, stock = ?, image_url = ? WHERE id = ?'
            );
            $stmt->execute([$sku, $name, $category, $supplier, $price, $stock, $image_url, $id]);
            
            echo json_encode(["message" => "Produto atualizado com sucesso"]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro ao atualizar produto"]);
        }
    }

    public function delete($id) {
        authenticate();
        try {
            // Deletar imagem física
            $stmt = $this->pdo->prepare("SELECT image_url FROM products WHERE id = ?");
            $stmt->execute([$id]);
            $product = $stmt->fetch();
            
            if ($product && $product['image_url']) {
                $filePath = __DIR__ . '/../../' . ltrim($product['image_url'], '/');
                if (file_exists($filePath)) unlink($filePath);
            }

            $stmt = $this->pdo->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["message" => "Produto removido"]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Erro ao remover produto"]);
        }
    }
}
