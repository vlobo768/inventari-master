
    // RBAC check
    const userStr = localStorage.getItem("currentUser");
    if (!userStr) {
      window.location.href = "index.html";
    } else {
      const user = JSON.parse(userStr);
      const userLevel = user.user_level || user.level;
      if (userLevel != 1 && userLevel != 2) {
        alert("Acceso denegado: No tienes permisos para gestionar productos.");
        window.location.href = "dashboard.html";
      }
    }

    async function loadCategories() {
      const response = await window.api.apiCall('categories', 'getAllCategories');
      if (response.success) {
        const cats = response.data;
        const filterCat = document.getElementById('filterCategory');
        const prodCat = document.getElementById('prodCategory');
        
        cats.forEach(c => {
          const opt1 = new Option(c.name, c.id);
          filterCat.add(opt1);
          const opt2 = new Option(c.name, c.id);
          prodCat.add(opt2);
        });
      }
    }

    async function loadProducts() {
      const search = document.getElementById('searchProduct').value;
      const category = document.getElementById('filterCategory').value;

      const response = await window.api.apiCall('products', 'getAllProducts', { search, category });
      
      if (response.success) {
        const products = response.data;
        const tbody = document.querySelector('#productsTable tbody');
        tbody.innerHTML = '';

        products.forEach(p => {
          const isLowStock = p.quantity <= p.min_stock;
          const row = document.createElement('tr');
          
          const userStr = localStorage.getItem("currentUser");
          const user = userStr ? JSON.parse(userStr) : {};
          const userLevel = user.user_level || user.level;

          row.innerHTML = \`
            <td>\${p.sku || '---'}</td>
            <td>\${p.name}</td>
            <td>\${p.category_name || 'Sin categoría'}</td>
            <td>$\${p.sale_price}</td>
            <td>
              <span class="\${isLowStock ? 'stock-warning' : ''}">
                \${p.quantity} \${isLowStock ? '⚠️' : ''}
              </span>
            </td>
            <td>\${p.min_stock}</td>
            <td class="actions">
              <button class="btn-action btn-kardex" onclick="openKardex(\${p.id})">Kardex</button>
              <button class="btn-action btn-edit" onclick="editProduct(\${p.id})">Editar</button>
              \${userLevel == 1 ? \`<button class="btn-action btn-delete" onclick="deleteProduct(\${p.id})">Eliminar</button>\` : ''}
            </td>
          \`;
          tbody.appendChild(row);
        });
      }
    }

    function openProductModal(prodId = null) {
      const userStr = localStorage.getItem("currentUser");
      const user = userStr ? JSON.parse(userStr) : {};
      const userLevel = user.user_level || user.level;

      if (userLevel != 1 && userLevel != 2) {
        alert("No tienes permisos para añadir o editar productos.");
        return;
      }

      const modal = document.getElementById('productModal');
      const form = document.getElementById('productForm');
      const title = document.getElementById('modalTitle');
      
      form.reset();
      document.getElementById('productId').value = '';

      if (prodId) {
        title.innerText = 'Editar Producto';
        loadProductData(prodId);
      } else {
        title.innerText = 'Nuevo Producto';
      }
      
      modal.style.display = 'flex';
    }

    async function loadProductData(id) {
      const response = await window.api.apiCall('products', 'getProductById', id);
      if (response.success && response.data) {
        const p = response.data;
        document.getElementById('productId').value = p.id;
        document.getElementById('prodName').value = p.name;
        document.getElementById('prodSku').value = p.sku || '';
        document.getElementById('prodBarcode').value = p.barcode || '';
        document.getElementById('prodCategory').value = p.categorie_id;
        document.getElementById('prodBuyPrice').value = p.buy_price;
        document.getElementById('prodSalePrice').value = p.sale_price;
        document.getElementById('prodQuantity').value = p.quantity;
        document.getElementById('prodMinStock').value = p.min_stock;
        document.getElementById('prodMediaId').value = p.media_id;
      }
    }

    function closeProductModal() {
      document.getElementById('productModal').style.display = 'none';
    }

    document.getElementById('productForm').onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('productId').value;
      const data = {
        name: document.getElementById('prodName').value,
        sku: document.getElementById('prodSku').value,
        barcode: document.getElementById('prodBarcode').value,
        category: document.getElementById('prodCategory').value,
        buyPrice: parseFloat(document.getElementById('prodBuyPrice').value),
        salePrice: parseFloat(document.getElementById('prodSalePrice').value),
        quantity: parseInt(document.getElementById('prodQuantity').value),
        minStock: parseInt(document.getElementById('prodMinStock').value),
        mediaId: document.getElementById('prodMediaId').value
      };

      const method = id ? 'updateProduct' : 'addProduct';
      const payload = id ? { id: parseInt(id), ...data } : data;

      const response = await window.api.apiCall('products', method, payload);
      if (response.success) {
        alert(id ? "Producto actualizado" : "Producto creado");
        closeProductModal();
        loadProducts();
      } else {
        alert("Error: " + response.message);
      }
    };

    async function deleteProduct(id) {
      if (confirm("¿Estás seguro de eliminar este producto?")) {
        const response = await window.api.apiCall('products', 'deleteProduct', id);
        if (response.success) {
          loadProducts();
        } else {
          alert("Error al eliminar");
        }
      }
    }

    async function openKardex(productId) {
      const response = await window.api.apiCall('products', 'getProductKardex', productId);
      if (response.success) {
        const movements = response.data;
        const tbody = document.getElementById('kardexTbody');
        tbody.innerHTML = '';

        movements.forEach(m => {
          const row = document.createElement('tr');
          row.innerHTML = \`
            <td>\${m.date}</td>
            <td>\${m.type}</td>
            <td>\${m.qty}</td>
            <td>\${m.reference}</td>
            <td>\${m.user_name || 'Sistema'}</td>
          \`;
          tbody.appendChild(row);
        });
        document.getElementById('kardexModal').style.display = 'flex';
      }
    }

    function closeKardexModal() {
      document.getElementById('kardexModal').style.display = 'none';
    }

    window.onload = async () => {
      await loadCategories();
      await loadProducts();
    };
  