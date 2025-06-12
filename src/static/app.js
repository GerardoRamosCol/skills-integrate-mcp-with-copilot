document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: Get unique categories from activities
  function getCategories(activities) {
    const categories = new Set();
    Object.values(activities).forEach((details) => {
      if (details.category) categories.add(details.category);
    });
    return Array.from(categories);
  }

  // State for filtering/sorting/search
  let allActivities = {};
  let currentSearch = "";
  let currentSort = "name";
  let currentCategory = "all";

  // Render activities with filters/sort/search
  function renderActivities() {
    activitiesList.innerHTML = "";
    let entries = Object.entries(allActivities);

    // Filter by category
    if (currentCategory !== "all") {
      entries = entries.filter(([_, d]) => d.category === currentCategory);
    }
    // Search
    if (currentSearch.trim()) {
      const q = currentSearch.trim().toLowerCase();
      entries = entries.filter(([name, d]) =>
        name.toLowerCase().includes(q) || (d.description && d.description.toLowerCase().includes(q))
      );
    }
    // Sort
    if (currentSort === "name") {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    } else if (currentSort === "spots") {
      entries.sort((a, b) => {
        const aSpots = a[1].max_participants - a[1].participants.length;
        const bSpots = b[1].max_participants - b[1].participants.length;
        return bSpots - aSpots;
      });
    }

    if (entries.length === 0) {
      activitiesList.innerHTML = '<p>No activities found.</p>';
      return;
    }

    entries.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";
      const spotsLeft = details.max_participants - details.participants.length;
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
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
        ${details.category ? `<p><strong>Category:</strong> ${details.category}</p>` : ""}
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;
      activitiesList.appendChild(activityCard);
    });
    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      allActivities = activities;
      // Populate category dropdown
      const categorySelect = document.getElementById("activity-category");
      const categories = getCategories(activities);
      categorySelect.innerHTML = '<option value="all">All Categories</option>' +
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join("");
      // Populate select dropdown for signup
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      Object.keys(activities).forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

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
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Event listeners for controls
  document.getElementById("activity-search").addEventListener("input", (e) => {
    currentSearch = e.target.value;
    renderActivities();
  });
  document.getElementById("activity-sort").addEventListener("change", (e) => {
    currentSort = e.target.value;
    renderActivities();
  });
  document.getElementById("activity-category").addEventListener("change", (e) => {
    currentCategory = e.target.value;
    renderActivities();
  });

  // Initialize app
  fetchActivities();
});
