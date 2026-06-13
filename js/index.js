document.addEventListener("DOMContentLoaded", () => {
  // ==========================================================================
  // TYPING EFFECT
  // ==========================================================================
  const roles = ["Software Engineer", "GenAI Developer", "RAG Architect", "AWS Solutions Architect", "Python Specialist"];
  const typeTextElement = document.getElementById("type-text");
  
  if (typeTextElement) {
    let roleIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    
    const typeEffect = () => {
      const currentRole = roles[roleIdx];
      
      if (!isDeleting) {
        // Typing characters
        typeTextElement.textContent = currentRole.substring(0, charIdx + 1);
        charIdx++;
        
        if (charIdx === currentRole.length) {
          // Pause at the end of the word
          isDeleting = true;
          setTimeout(typeEffect, 1500); // 1500ms pause between words
        } else {
          setTimeout(typeEffect, 100);  // 100ms typing speed
        }
      } else {
        // Deleting characters
        typeTextElement.textContent = currentRole.substring(0, charIdx - 1);
        charIdx--;
        
        if (charIdx === 0) {
          isDeleting = false;
          roleIdx = (roleIdx + 1) % roles.length; // cycle through roles
          setTimeout(typeEffect, 200);  // short pause before typing next word
        } else {
          setTimeout(typeEffect, 50);   // 50ms deleting speed
        }
      }
    };
    
    // Start typing effect
    setTimeout(typeEffect, 500);
  }

  // ==========================================================================
  // INTERSECTION OBSERVER - SCROLL REVEAL ANIMATIONS
  // ==========================================================================
  const revealElements = document.querySelectorAll(".reveal-on-scroll");
  
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target); // Reveal only once
        }
      });
    }, {
      root: null,
      threshold: 0.15,
      rootMargin: "0px 0px -50px 0px"
    });
    
    revealElements.forEach(element => {
      revealObserver.observe(element);
    });
  }

  // ==========================================================================
  // INTERSECTION OBSERVER - ACTIVE NAV LINK HIGHLIGHT (SCROLL SPY)
  // ==========================================================================
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-link");
  
  if (sections.length > 0 && navLinks.length > 0) {
    const scrollSpyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinks.forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("href") === `#${id}`) {
              link.classList.add("active");
            }
          });
        }
      });
    }, {
      root: null,
      threshold: 0.4,
      rootMargin: "-20% 0px -40% 0px"
    });
    
    sections.forEach(section => {
      scrollSpyObserver.observe(section);
    });
  }

  // ==========================================================================
  // DYNAMIC HOMEPAGE BLOG PREVIEW
  // ==========================================================================
  const homepageBlogGrid = document.getElementById("homepage-blog-grid");
  
  if (homepageBlogGrid && typeof blogPosts !== "undefined") {
    // Sort blog posts by date descending
    const sortedPosts = [...blogPosts].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Take latest 3 posts
    const latestPosts = sortedPosts.slice(0, 3);
    
    homepageBlogGrid.innerHTML = ""; // Clear placeholders
    
    latestPosts.forEach(post => {
      const card = document.createElement("article");
      card.className = "blog-card reveal-on-scroll";
      
      const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
      
      // Calculate read time
      const wordCount = post.content.split(/\s+/).length;
      const readTime = Math.ceil(wordCount / 200);
      
      const tagsHtml = post.tags.map(tag => `<span class="blog-tag">#${tag}</span>`).join("");
      
      card.innerHTML = `
        <div class="blog-content">
          <div class="blog-meta">
            <span class="blog-date"><i class="far fa-calendar"></i> ${formattedDate}</span>
            <span class="blog-time"><i class="far fa-clock"></i> ${readTime} min read</span>
          </div>
          <h3 class="blog-card-title">
            <a href="post.html?id=${post.id}">${post.title}</a>
          </h3>
          <p class="blog-excerpt">${post.excerpt}</p>
          <div class="blog-tags">
            ${tagsHtml}
          </div>
          <a href="post.html?id=${post.id}" class="blog-read-more">Read more <span>&rarr;</span></a>
        </div>
      `;
      
      homepageBlogGrid.appendChild(card);
      
      // If reveal observer is active, register the newly added element
      if (typeof revealObserver !== "undefined") {
        revealObserver.observe(card);
      } else {
        // Fallback if observer is not active
        card.classList.add("revealed");
      }
    });
  }
});
