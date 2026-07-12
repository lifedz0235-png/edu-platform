const loginBtn = document.getElementById("loginBtn");

function getDeviceId() {
  let deviceId = localStorage.getItem("pcr_device_id");

  if (!deviceId) {
    deviceId = "device-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    localStorage.setItem("pcr_device_id", deviceId);
  }

  return deviceId;
}

loginBtn.addEventListener("click", async () => {
  const data = {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value.trim(),
    deviceId: getDeviceId()
  };

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error);
    return;
  }

  localStorage.setItem("pcr_current_user", JSON.stringify(result.user));

  localStorage.setItem("pcr_user_profile", JSON.stringify({
    name: result.user.name,
    role: result.user.role === "admin" ? "Admin" : "Étudiant",
    bio: "",
    promotion: ""
  }));

  window.location.href = "/";
});