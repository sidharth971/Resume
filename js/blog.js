document.addEventListener("DOMContentLoaded", () => {
  if (typeof blogPosts === "undefined") {
    console.error("blogPosts data is not loaded!");
    return;
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  let filteredPosts = [...blogPosts].sort((a, b) => new Date(b.date) - new Date(a.date));
  let selectedTags = [];
  let searchQuery = "";
  let currentPage = 1;
  const postsPerPage = 6;

  // DOM Elements
  const blogListGrid = document.getElementById("blog-list-grid");
  const tagsFilterContainer = document.getElementById("filter-tags-list");
  const searchInput = document.getElementById("search-input");
  const paginationContainer = document.getElementById("pagination");

  // ==========================================================================
  // INITIALIZE DYNAMIC FILTER TAGS
  // ==========================================================================
  const initTags = () => {
    if (!tagsFilterContainer) return;
    
    // Extract unique tags
    const allTags = new Set();
    blogPosts.forEach(post => {
      post.tags.forEach(tag => allTags.add(tag));
    });

    tagsFilterContainer.innerHTML = "";
    
    // Sort and render tag buttons
    Array.from(allTags).sort().forEach(tag => {
      const btn = document.createElement("button");
      btn.className = "filter-tag-btn";
      btn.dataset.tag = tag;
      btn.textContent = `#${tag}`;
      btn.setAttribute("aria-pressed", "false");
      
      btn.addEventListener("click", () => {
        toggleTag(tag, btn);
      });
      
      tagsFilterContainer.appendChild(btn);
    });
  };

  const toggleTag = (tag, btnElement) => {
    const idx = selectedTags.indexOf(tag);
    if (idx > -1) {
      selectedTags.splice(idx, 1);
      btnElement.classList.remove("active");
      btnElement.setAttribute("aria-pressed", "false");
    } else {
      selectedTags.push(tag);
      btnElement.classList.add("active");
      btnElement.setAttribute("aria-pressed", "true");
    }
    
    currentPage = 1; // reset page on filter change
    applyFilters();
  };

  // ==========================================================================
  // SEARCH & FILTER LOGIC
  // ==========================================================================
  const applyFilters = () => {
    filteredPosts = blogPosts.filter(post => {
      // 1. Text Search query matching
      const matchesSearch = searchQuery === "" || 
        post.title.toLowerCase().includes(searchQuery) ||
        post.excerpt.toLowerCase().includes(searchQuery) ||
        post.content.toLowerCase().includes(searchQuery);

      // 2. Tag multi-select matching (AND Logic: must contain all selected tags)
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.every(tag => post.tags.includes(tag));

      return matchesSearch && matchesTags;
    });

    // Sort by date descending
    filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    renderBlogGrid();
    renderPagination();
  };

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      currentPage = 1; // reset page on search
      applyFilters();
    });
  }

  // ==========================================================================
  // RENDER BLOG CARDS
  // ==========================================================================
  const renderBlogGrid = () => {
    if (!blogListGrid) return;
    
    blogListGrid.innerHTML = "";
    
    if (filteredPosts.length === 0) {
      blogListGrid.innerHTML = `
        <div class="empty-state grid-colspan-all">
          <p>No posts found matching the criteria. Try clearing your filters or query.</p>
        </div>
      `;
      return;
    }

    // Paginated slice
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const paginatedSlice = filteredPosts.slice(startIndex, endIndex);

    paginatedSlice.forEach(post => {
      const card = document.createElement("article");
      card.className = "blog-card";
      
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
      
      blogListGrid.appendChild(card);
    });
  };

  // ==========================================================================
  // PAGINATION CONTROL GENERATOR
  // ==========================================================================
  const renderPagination = () => {
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = "";
    
    const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
    if (totalPages <= 1) return; // No pagination needed for 1 page
    
    // 1. Previous Button
    const prevBtn = document.createElement("button");
    prevBtn.className = "page-btn";
    prevBtn.innerHTML = "&larr;";
    prevBtn.disabled = currentPage === 1;
    prevBtn.ariaLabel = "Previous page";
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderBlogGrid();
        renderPagination();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
    paginationContainer.appendChild(prevBtn);
    
    // 2. Numbered Buttons
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `page-btn ${currentPage === i ? "active" : ""}`;
      pageBtn.textContent = i;
      pageBtn.ariaLabel = `Go to page ${i}`;
      if (currentPage === i) {
        pageBtn.setAttribute("aria-current", "page");
      }
      
      pageBtn.addEventListener("click", () => {
        currentPage = i;
        renderBlogGrid();
        renderPagination();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      
      paginationContainer.appendChild(pageBtn);
    }
    
    // 3. Next Button
    const nextBtn = document.createElement("button");
    nextBtn.className = "page-btn";
    nextBtn.innerHTML = "&rarr;";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.ariaLabel = "Next page";
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderBlogGrid();
        renderPagination();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
    paginationContainer.appendChild(nextBtn);
  };

  // Initialization
  initTags();
  applyFilters();
});
