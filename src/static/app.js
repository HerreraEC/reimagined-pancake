document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const adminToggleBtn = document.getElementById("admin-toggle");
  const adminStatus = document.getElementById("admin-status");

  let adminToken = localStorage.getItem("adminToken") || "";

  function isAdminMode() {
    return Boolean(adminToken);
  }

  function setMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAdminUI() {
    if (isAdminMode()) {
      adminToggleBtn.textContent = "👤 Admin: Logout";
      adminStatus.textContent = "Admin mode is ON";
      adminStatus.className = "admin-on";
    } else {
      adminToggleBtn.textContent = "👤 Admin Login";
      adminStatus.textContent = "Admin mode is OFF";
      adminStatus.className = "admin-off";
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isAdminMode()
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!isAdminMode()) {
      setMessage("Admin mode required to remove participants.", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(
          email
        )}&admin_token=${encodeURIComponent(adminToken)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  adminToggleBtn.addEventListener("click", async () => {
    if (isAdminMode()) {
      try {
        await fetch("/admin/logout", { method: "POST" });
      } catch (error) {
        console.error("Error during admin logout:", error);
      }

      adminToken = "";
      localStorage.removeItem("adminToken");
      updateAdminUI();
      fetchActivities();
      setMessage("Exited admin mode.", "info");
      return;
    }

    const password = window.prompt("Enter admin password:");
    if (!password) {
      return;
    }

    try {
      const response = await fetch(
        `/admin/login?password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.detail || "Invalid admin password.", "error");
        return;
      }

      adminToken = result.token;
      localStorage.setItem("adminToken", adminToken);
      updateAdminUI();
      fetchActivities();
      setMessage("Admin mode enabled.", "success");
    } catch (error) {
      console.error("Error during admin login:", error);
      setMessage("Failed to enter admin mode.", "error");
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  updateAdminUI();
  fetchActivities();
});
