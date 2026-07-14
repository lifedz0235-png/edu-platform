function getCurrentUserId() {
  try {
    const user = JSON.parse(
      localStorage.getItem("pcr_current_user")
    );

    return user?.id ? String(user.id) : "guest";
  } catch (error) {
    return "guest";
  }
}

function userStorageKey(key) {
  return `pcr_user_${getCurrentUserId()}_${key}`;
}

function getUserData(key, fallback = null) {
  const value = localStorage.getItem(userStorageKey(key));

  if (value === null) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function setUserData(key, value) {
  localStorage.setItem(
    userStorageKey(key),
    JSON.stringify(value)
  );
}

function removeUserData(key) {
  localStorage.removeItem(userStorageKey(key));
}

window.getCurrentUserId = getCurrentUserId;
window.userStorageKey = userStorageKey;
window.getUserData = getUserData;
window.setUserData = setUserData;
window.removeUserData = removeUserData;