
    // RBAC check
    const userStr = localStorage.getItem("currentUser");
    if (!userStr) {
      window.location.href = "index.html";
    } else {
      const user = JSON.parse(userStr);
      const userLevel = user.user_level || user.level;
      if (userLevel != 1) {
        alert("Acceso denegado: Solo el Administrador puede gestionar usuarios.");
        window.location.href = "dashboard.html";
      }
    }

    async function loadRoles() {
      const response = await window.api.apiCall('users', 'findAllGroups');
      if (response.success) {
        const roles = response.data;
        const roleSelect = document.getElementById('userRole');
        const filterRole = document.getElementById('filterRole');
        
        roles.forEach(role => {
          const opt = new Option(role.group_name, role.group_level);
          roleSelect.add(opt);
          
          const filterOpt = new Option(role.group_name, role.group_level);
          filterRole.add(filterOpt);
        });
      }
    }

    async function loadUsers() {
      const search = document.getElementById('searchUser').value;
      const role = document.getElementById('filterRole').value;
      const status = document.getElementById('filterStatus').value;

      const response = await window.api.apiCall('users', 'getAllUsers', { search, role, status });
      
      if (response.success) {
        const users = response.data;
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';

        users.forEach(u => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${u.name}</td>
            <td>${u.username}</td>
            <td>${u.email || 'N/A'}</td>
            <td>${u.phone || 'N/A'}</td>
            <td>${u.role || 'N/A'}</td>
            <td>
              <span class="status-badge ${u.status == 1 ? 'status-active' : 'status-inactive'}">
                ${u.status == 1 ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td class="actions">
              <button class="btn-action btn-edit" onclick="editUser(${u.id})">Editar</button>
              <button class="btn-action btn-status" onclick="toggleStatus(${u.id}, ${u.status})">Estado</button>
              <button class="btn-action btn-delete" onclick="deleteUser(${u.id})">Eliminar</button>
            </td>
          `;
          tbody.appendChild(row);
        });
      }
    }

    function openUserModal(userId = null) {
      const modal = document.getElementById('userModal');
      const form = document.getElementById('userForm');
      const title = document.getElementById('modalTitle');
      
      form.reset();
      document.getElementById('userId').value = '';
      document.getElementById('userPassword').required = true;

      if (userId) {
        title.innerText = 'Editar Usuario';
        document.getElementById('userPassword').required = false;
        loadUserData(userId);
      } else {
        title.innerText = 'Nuevo Usuario';
      }
      
      modal.style.display = 'flex';
    }

    async function loadUserData(id) {
      const response = await window.api.apiCall('users', 'getUserProfile', id);
      if (response && response.success && response.data) {
        const u = response.data;
        document.getElementById('userId').value = u.id;
        document.getElementById('userName').value = u.name;
        document.getElementById('userUsername').value = u.username;
        document.getElementById('userEmail').value = u.email || '';
        document.getElementById('userPhone').value = u.phone || '';
        document.getElementById('userRole').value = u.user_level;
        document.getElementById('userStatus').value = u.status;
      }
    }

    function closeUserModal() {
      document.getElementById('userModal').style.display = 'none';
    }

    document.getElementById('userForm').onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('userId').value;
      const data = {
        name: document.getElementById('userName').value,
        username: document.getElementById('userUsername').value,
        password: document.getElementById('userPassword').value,
        email: document.getElementById('userEmail').value,
        phone: document.getElementById('userPhone').value,
        level: document.getElementById('userRole').value,
        status: document.getElementById('userStatus').value
      };

      const method = id ? 'updateUser' : 'addUser';
      const payload = id ? { id, ...data } : data;

      const response = await window.api.apiCall('users', method, payload);
      if (response.success) {
        alert(id ? "Usuario actualizado" : "Usuario creado");
        closeUserModal();
        loadUsers();
      } else {
        alert("Error: " + response.message);
      }
    };

    async function deleteUser(id) {
      if (confirm("¿Estás seguro de eliminar este usuario?")) {
        const response = await window.api.apiCall('users', 'deleteUser', id);
        if (response.success) {
          loadUsers();
        } else {
          alert("Error: " + response.message);
        }
      }
    }

    async function toggleStatus(id, currentStatus) {
      const newStatus = currentStatus == 1 ? 0 : 1;
      const response = await window.api.apiCall('users', 'toggleUserStatus', id, newStatus);
      if (response.success) {
        loadUsers();
      } else {
        alert("Error al cambiar estado");
      }
    }

    // ✅ FIX: función editUser faltante
    function editUser(id) {
      openUserModal(id);
    }

    window.onload = async () => {
      await loadRoles();
      await loadUsers();
    };
  