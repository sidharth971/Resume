document.addEventListener("DOMContentLoaded", () => {
  if (typeof blogPosts === "undefined") {
    console.error("blogPosts data is not loaded!");
    return;
  }

  // DOM Elements
  const titleEl = document.getElementById("post-title");
  const dateEl = document.getElementById("post-date");
  const readTimeEl = document.getElementById("post-read-time");
  const tagsContainer = document.getElementById("post-tags");
  const contentEl = document.getElementById("post-content");
  
  const prevCard = document.getElementById("post-prev-card");
  const nextCard = document.getElementById("post-next-card");

  // ==========================================================================
  // PARSE QUERY & RESOLVE POST
  // ==========================================================================
  const urlParams = new URLSearchParams(window.location.search);
  const postId = parseInt(urlParams.get("id"), 10);

  if (isNaN(postId)) {
    showErrorState();
    return;
  }

  const currentPost = blogPosts.find(post => post.id === postId);

  if (!currentPost) {
    showErrorState();
    return;
  }

  // ==========================================================================
  // RENDER POST CONTENTS
  // ==========================================================================
  // Render details
  titleEl.textContent = currentPost.title;
  
  const formattedDate = new Date(currentPost.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  dateEl.innerHTML = `<i class="far fa-calendar"></i> ${formattedDate}`;

  // Word count & read time
  const wordCount = currentPost.content.split(/\s+/).length;
  const readTime = Math.ceil(wordCount / 200);
  readTimeEl.innerHTML = `<i class="far fa-clock"></i> ${readTime} min read`;

  // Tags
  tagsContainer.innerHTML = currentPost.tags.map(tag => `<span class="blog-tag">#${tag}</span>`).join("");

  // Markdown parsing (with fallback check for marked.js)
  if (typeof marked !== "undefined") {
    // Configure marked to handle code breaks and custom renderer
    marked.setOptions({
      breaks: true,
      gfm: true
    });
    contentEl.innerHTML = marked.parse(currentPost.content);
  } else {
    // Basic fallback if marked.js CDN fails
    contentEl.innerHTML = `<pre style="white-space: pre-wrap;">${currentPost.content}</pre>`;
  }

  // ==========================================================================
  // PREV / NEXT NAVIGATION
  // ==========================================================================
  // Sort posts by date descending
  const sortedPosts = [...blogPosts].sort((a, b) => new Date(b.date) - new Date(a.date));
  const currentIndex = sortedPosts.findIndex(post => post.id === postId);

  // Since sorted descending:
  // - Older post (previous) is at currentIndex + 1
  // - Newer post (next) is at currentIndex - 1
  const olderPost = sortedPosts[currentIndex + 1];
  const newerPost = sortedPosts[currentIndex - 1];

  if (olderPost && prevCard) {
    prevCard.href = `post.html?id=${olderPost.id}`;
    prevCard.innerHTML = `
      <span class="post-nav-label">&larr; Older Post</span>
      <div class="post-nav-title">${olderPost.title}</div>
    `;
    prevCard.style.display = "block";
  } else if (prevCard) {
    prevCard.style.display = "none";
  }

  if (newerPost && nextCard) {
    nextCard.href = `post.html?id=${newerPost.id}`;
    nextCard.innerHTML = `
      <span class="post-nav-label">Newer Post &rarr;</span>
      <div class="post-nav-title">${newerPost.title}</div>
    `;
    nextCard.style.display = "block";
  } else if (nextCard) {
    nextCard.style.display = "none";
  }

  // Adjust container spacing if only one card is active
  const navContainer = document.querySelector(".post-navigation");
  if (navContainer) {
    if (!olderPost && !newerPost) {
      navContainer.style.display = "none";
    } else {
      navContainer.style.display = "flex";
    }
  }

  function showErrorState() {
    if (titleEl) titleEl.textContent = "Article Not Found";
    if (contentEl) {
      contentEl.innerHTML = `
        <div class="empty-state">
          <p>The requested blog post could not be resolved. It may have been relocated or deleted.</p>
          <a href="blog.html" class="btn btn-primary" style="margin-top: 1.5rem;">Return to Blog</a>
        </div>
      `;
    }
    if (dateEl) dateEl.style.display = "none";
    if (readTimeEl) readTimeEl.style.display = "none";
    if (tagsContainer) tagsContainer.style.display = "none";
    if (prevCard) prevCard.style.display = "none";
    if (nextCard) nextCard.style.display = "none";
  }
});
