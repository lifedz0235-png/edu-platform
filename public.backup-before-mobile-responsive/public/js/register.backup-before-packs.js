const registerBtn = document.getElementById("registerBtn");

registerBtn.addEventListener("click", async () => {
  const data = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    university: document.getElementById("university").value.trim(),
    promotion: document.getElementById("promotion").value.trim()
  };

  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error);
    return;
  }

  alert(result.message);
  window.location.href = "/pages/auth/login.html";
});