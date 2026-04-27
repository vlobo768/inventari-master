async function login() {
  const usernameInput = document.getElementById("username").value.trim();
  const passwordInput = document.getElementById("password").value.trim();
  const msgDiv = document.getElementById("msg");
  const btn = document.getElementById("btnLogin");

  msgDiv.innerHTML = "";

  if (!usernameInput || !passwordInput) {
    msgDiv.style.color = "#e74c3c";
    msgDiv.innerHTML = "⚠ Por favor, ingrese usuario y contraseña.";
    return;
  }

  btn.disabled = true;
  msgDiv.style.color = "#00d2ff";
  msgDiv.innerHTML = "⏳ Verificando credenciales...";

  try {
    const response = await window.api.login(usernameInput, passwordInput);

    if (response.success) {
      msgDiv.style.color = "#2ecc71";
      msgDiv.innerHTML = "✅ ¡Acceso concedido! Redirigiendo...";

      // Guardar usuario en localStorage para uso en UI
      localStorage.setItem("currentUser", JSON.stringify(response.user));

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 500);
    } else {
      btn.disabled = false;
      msgDiv.style.color = "#e74c3c";
      msgDiv.innerHTML = "❌ " + (response.message || "Usuario o contraseña incorrectos.");
    }
  } catch (error) {
    btn.disabled = false;
    console.error("Error al iniciar sesión:", error);
    msgDiv.style.color = "#e74c3c";
    msgDiv.innerHTML = "❌ Error interno al iniciar sesión.";
  }
}

// Permitir login con Enter
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("password").addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
  });
  document.getElementById("username").addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
  });
});
