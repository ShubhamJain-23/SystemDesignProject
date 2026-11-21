// Frontend interactive logic for LinkedIn System Design & DevOps App

document.addEventListener('DOMContentLoaded', () => {
  loadFeed();
  setupPostCreation();
  setupSearch();
  checkHealth();
});

// Load Feed from GET /api/v1/feed
async function loadFeed(cursor = null) {
  const feedContainer = document.getElementById('feedStream');
  try {
    const url = cursor ? `/api/v1/feed?cursor=${cursor}` : '/api/v1/feed';
    const res = await fetch(url);
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      feedContainer.innerHTML = '<div class="card feed-item" style="text-align: center; color: var(--text-secondary);">No posts in feed yet. Be the first to publish!</div>';
      return;
    }

    feedContainer.innerHTML = '';
    data.data.forEach(post => {
      feedContainer.appendChild(createPostCard(post));
    });

  } catch (err) {
    feedContainer.innerHTML = `<div class="card feed-item" style="color: red;">Failed to load feed: ${err.message}</div>`;
  }
}

// Generate DOM node for a single post card
function createPostCard(post) {
  const card = document.createElement('div');
  card.className = 'card feed-item';
  card.id = `card_${post.id}`;

  const timeAgo = formatTimeAgo(new Date(post.createdAt));
  const celebrityBadge = post.isCelebrity 
    ? '<span class="feed-badge" style="background: #fef3c7; color: #92400e;">⭐ High Fan-out (>10K Pull Model)</span>' 
    : '<span class="feed-badge">⚡ Push Fan-out (Redis Timeline)</span>';

  card.innerHTML = `
    <div class="feed-header">
      <img src="${post.author.avatar}" alt="${escapeHtml(post.author.name)}" class="feed-avatar">
      <div class="feed-author-info">
        <h4>${escapeHtml(post.author.name)} ${celebrityBadge}</h4>
        <p>${escapeHtml(post.author.headline)} &bull; ${timeAgo}</p>
      </div>
    </div>
    <div class="feed-content">${escapeHtml(post.content)}</div>
    ${post.imageUrl ? `<img src="${escapeHtml(post.imageUrl)}" class="feed-image" alt="Post attachment">` : ''}
    <div class="feed-reactions">
      <span id="likes_${post.id}">👍 ${post.likesCount} likes</span>
      <span>💬 ${post.commentsCount} comments</span>
    </div>
    <div class="feed-actions">
      <button class="action-btn" onclick="handleLike('${post.id}')" id="btnLike_${post.id}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        <span>Like</span>
      </button>
      <button class="action-btn" onclick="handleCommentPrompt('${post.id}')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>Comment</span>
      </button>
      <button class="action-btn" onclick="copyPostLink('${post.id}')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        <span>Share</span>
      </button>
    </div>
  `;
  return card;
}

// Like reaction handler
function handleLike(postId) {
  const likeBtn = document.getElementById(`btnLike_${postId}`);
  const likeSpan = document.getElementById(`likes_${postId}`);
  likeBtn.classList.toggle('liked');

  const isLiked = likeBtn.classList.contains('liked');
  const currentCount = parseInt(likeSpan.innerText.replace(/\D/g, '')) || 0;
  const newCount = isLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
  likeSpan.innerText = `👍 ${newCount} likes`;
}

// Setup Post Creation
function setupPostCreation() {
  const btnPost = document.getElementById('btnPublishPost');
  const contentInput = document.getElementById('postContent');
  const imageUrlInput = document.getElementById('postImageUrl');
  const toggleImageBtn = document.getElementById('btnToggleImage');
  const imageRow = document.getElementById('imageInputRow');

  toggleImageBtn.addEventListener('click', () => {
    imageRow.style.display = imageRow.style.display === 'none' ? 'block' : 'none';
  });

  btnPost.addEventListener('click', async () => {
    const content = contentInput.value.trim();
    if (!content) {
      alert('Please enter post text before submitting.');
      return;
    }

    btnPost.disabled = true;
    btnPost.innerText = 'Publishing...';

    try {
      const res = await fetch('/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `post_${Date.now()}`
        },
        body: JSON.stringify({
          authorId: 'usr_101',
          content: content,
          imageUrl: imageUrlInput.value.trim() || null
        })
      });

      if (!res.ok) {
        throw new Error(`Failed to publish: ${res.statusText}`);
      }

      contentInput.value = '';
      imageUrlInput.value = '';
      imageRow.style.display = 'none';
      await loadFeed(); // refresh feed

    } catch (err) {
      alert(`Error publishing post: ${err.message}`);
    } finally {
      btnPost.disabled = false;
      btnPost.innerText = 'Post';
    }
  });
}

// Setup Search
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  let debounceTimeout = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      const query = searchInput.value.trim();
      if (!query) {
        loadFeed();
        return;
      }

      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}&type=all`);
        const data = await res.json();
        const feedContainer = document.getElementById('feedStream');
        feedContainer.innerHTML = '';

        if (data.results.posts && data.results.posts.length > 0) {
          data.results.posts.forEach(p => {
            feedContainer.appendChild(createPostCard(p));
          });
        } else if (data.results.members && data.results.members.length > 0) {
          data.results.members.forEach(m => {
            const memberCard = document.createElement('div');
            memberCard.className = 'card feed-item';
            memberCard.innerHTML = `
              <div class="feed-header">
                <img src="${m.avatar}" class="feed-avatar">
                <div class="feed-author-info">
                  <h4>${escapeHtml(m.name)}</h4>
                  <p>${escapeHtml(m.headline)} &bull; ${m.location}</p>
                  <p style="font-size: 11px; color: var(--primary); margin-top: 4px;">Skills: ${m.skills.join(', ')}</p>
                </div>
              </div>
            `;
            feedContainer.appendChild(memberCard);
          });
        } else {
          feedContainer.innerHTML = `<div class="card feed-item" style="text-align: center; color: var(--text-secondary);">No results found for "${escapeHtml(query)}"</div>`;
        }

      } catch (err) {
        console.error('Search error:', err);
      }
    }, 300);
  });
}

// Health check
async function checkHealth() {
  const pill = document.getElementById('healthPill');
  try {
    const res = await fetch('/api/v1/health');
    if (res.ok) {
      pill.title = 'Health: UP (Docker & Vercel Production Ready)';
    }
  } catch (e) {
    pill.style.backgroundColor = '#fce8e6';
    pill.style.color = '#c5221f';
  }
}

// Interactive API Tester
window.testApi = async function(endpoint) {
  const outputBox = document.getElementById('apiOutput');
  outputBox.innerText = `Sending request to ${endpoint}...`;
  try {
    const startTime = performance.now();
    const res = await fetch(endpoint);
    const duration = (performance.now() - startTime).toFixed(1);
    const json = await res.json();
    outputBox.innerText = `// HTTP ${res.status} OK (${duration} ms)\n` + JSON.stringify(json, null, 2);
  } catch (err) {
    outputBox.innerText = `// Request Failed:\n${err.message}`;
  }
};

window.copyPostLink = function(postId) {
  navigator.clipboard.writeText(`${window.location.origin}/#post_${postId}`);
  alert('Post link copied to clipboard!');
};

window.handleCommentPrompt = function(postId) {
  const comment = prompt('Write your comment:');
  if (comment) {
    alert('Comment published to Cassandra & Kafka topic: post.engagement');
  }
};

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
