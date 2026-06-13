document.addEventListener("DOMContentLoaded", () => {
  // ==========================================================================
  // PROFILE AVATAR UPLOADER & PERSISTENCE
  // ==========================================================================
  const avatarUploader = document.querySelector(".avatar-uploader");
  const avatarInput = document.getElementById("header-avatar-input");

  const applyAvatar = (base64) => {
    const avatarImgs = document.querySelectorAll(".avatar-img");
    const avatarPlaceholders = document.querySelectorAll(".avatar-placeholder");
    
    avatarImgs.forEach(img => {
      img.src = base64;
      img.style.display = "block";
    });
    
    avatarPlaceholders.forEach(ph => {
      ph.style.display = "none";
    });
  };

  const resetAvatar = () => {
    const avatarImgs = document.querySelectorAll(".avatar-img");
    const avatarPlaceholders = document.querySelectorAll(".avatar-placeholder");
    
    avatarImgs.forEach(img => {
      img.src = "";
      img.style.display = "none";
    });
    
    avatarPlaceholders.forEach(ph => {
      ph.style.display = "flex";
    });
  };

  // Load existing avatar if present
  const savedAvatar = localStorage.getItem("profile_avatar");
  if (savedAvatar) {
    applyAvatar(savedAvatar);
  }

  if (avatarUploader && avatarInput) {
    // Click uploader triggers file input
    avatarUploader.addEventListener("click", () => {
      avatarInput.click();
    });

    // Handle file selection
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        // Enforce maximum size (e.g. 2MB to keep localStorage performance optimal)
        if (file.size > 2 * 1024 * 1024) {
          alert("Image is too large. Please select an image under 2MB.");
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64String = event.target.result;
          localStorage.setItem("profile_avatar", base64String);
          applyAvatar(base64String);
        };
        reader.readAsDataURL(file);
      }
    });

    // Right-click (contextmenu) resets profile picture
    avatarUploader.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (confirm("Do you want to reset your profile picture to the default monogram?")) {
        localStorage.removeItem("profile_avatar");
        resetAvatar();
      }
    });
  }

  // ==========================================================================
  // MOBILE NAVIGATION DRAWER
  // ==========================================================================
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const navLinks = document.querySelectorAll(".nav-link");

  if (navToggle && navMenu) {
    const toggleMenu = () => {
      const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", !isExpanded);
      navToggle.classList.toggle("active");
      navMenu.classList.toggle("active");
      
      // Prevent body scrolling when menu is open
      if (!isExpanded) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    };

    navToggle.addEventListener("click", toggleMenu);

    // Close menu when clicking a link
    navLinks.forEach(link => {
      link.addEventListener("click", () => {
        if (navMenu.classList.contains("active")) {
          toggleMenu();
        }
      });
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (navMenu.classList.contains("active") && 
          !navMenu.contains(e.target) && 
          !navToggle.contains(e.target)) {
        toggleMenu();
      }
    });

    // Close menu with Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navMenu.classList.contains("active")) {
        toggleMenu();
        navToggle.focus();
      }
    });
  }

  // ==========================================================================
  // HEADER SCROLL EFFECTS & BACK-TO-TOP BUTTON
  // ==========================================================================
  const header = document.querySelector(".header");
  const backToTopBtn = document.querySelector(".back-to-top");

  const handleScroll = () => {
    const scrollY = window.scrollY;

    // Header styling on scroll
    if (header) {
      if (scrollY > 50) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    }

    // Back-to-top visibility
    if (backToTopBtn) {
      if (scrollY > 500) {
        backToTopBtn.classList.add("show");
      } else {
        backToTopBtn.classList.remove("show");
      }
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll(); // Initial check on load

  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  }

  // ==========================================================================
  // CONTACT FORM HANDLER (MAILTO FORMATTING)
  // ==========================================================================
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = document.getElementById("form-name").value.trim();
      const email = document.getElementById("form-email").value.trim();
      const message = document.getElementById("form-message").value.trim();

      if (!name || !email || !message) {
        alert("Please fill in all fields.");
        return;
      }

      const recipient = "sidharth.backend@gmail.com";
      const subject = encodeURIComponent(`Portfolio Contact from ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\n` +
        `Email: ${email}\n\n` +
        `Message:\n${message}`
      );

      const mailtoUrl = `mailto:${recipient}?subject=${subject}&body=${body}`;

      // Open email client
      window.location.href = mailtoUrl;

      // Reset form fields
      contactForm.reset();
    });
  }
});
