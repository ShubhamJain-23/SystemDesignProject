const url = require('url');
const { members, posts, connectionRequests, conversations } = require('./data');

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key'
  });
  res.end(JSON.stringify(data, null, 2));
}

// Request handler
async function handleApiRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname.replace(/^\/api/, ''); // normalize /api/v1 to /v1
  const method = req.method;
  const query = parsedUrl.query;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key'
    });
    return res.end();
  }

  try {
    // 1. Health check
    if (pathname === '/v1/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'production',
        service: 'LinkedIn System Design Core API (Part B)',
        specs: {
          runtime: process.version,
          platform: process.platform,
          architecture: 'Slide 5 Microservices + Gateway'
        }
      });
    }

    // 2. System Architecture metadata (from Slides 1-8)
    if (pathname === '/v1/system/architecture' && method === 'GET') {
      return sendJson(res, 200, {
        topic: 'LinkedIn System Design & DevOps (Part A & B)',
        dailyActiveUsers: '100M DAU / 1B Total Members',
        peakThroughput: '100K Read RPS, 7K Write RPS',
        dataDistribution: {
          mediaObjectStorage: '270 TB/yr (S3 + CloudFront CDN)',
          messages: '36 TB/yr (Cassandra write-optimized)',
          posts: '1.8 TB/yr (Cassandra + Redis Timeline cache)',
          profilesConnections: 'MySQL (Sharded by hash of member_id)'
        },
        cachingStrategy: 'Redis Cache-Aside with 90% hit rate, cutting DB load 10x',
        eventStreaming: 'Apache Kafka for post.created, connection.events, notification fan-out',
        celebrityHandling: 'Hybrid Push (<10K followers) / Pull (>10K followers) to prevent write fan-out storms'
      });
    }

    // 3. GET /v1/feed?cursor=&limit= (Slide 4)
    if (pathname === '/v1/feed' && method === 'GET') {
      const limit = parseInt(query.limit) || 5;
      const cursor = query.cursor;

      let sortedPosts = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      let startIndex = 0;
      if (cursor) {
        const foundIndex = sortedPosts.findIndex(p => p.id === cursor);
        if (foundIndex !== -1) {
          startIndex = foundIndex + 1;
        }
      }

      const paginatedPosts = sortedPosts.slice(startIndex, startIndex + limit);
      const enrichedPosts = paginatedPosts.map(p => {
        const author = members.find(m => m.id === p.authorId) || {
          id: p.authorId,
          name: 'Unknown Member',
          headline: 'LinkedIn Member',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
        };
        return {
          ...p,
          author
        };
      });

      const nextCursor = paginatedPosts.length === limit ? paginatedPosts[paginatedPosts.length - 1].id : null;

      return sendJson(res, 200, {
        data: enrichedPosts,
        pagination: {
          limit,
          nextCursor,
          hasMore: Boolean(nextCursor)
        },
        metadata: {
          cacheStatus: 'HIT (Redis L1 cache-aside)',
          servingLatencyMs: 14,
          fanOutStrategy: 'Hybrid Push/Pull (Slide 8)'
        }
      });
    }

    // 4. POST /v1/posts (Slide 4)
    if (pathname === '/v1/posts' && method === 'POST') {
      const body = await parseBody(req);
      if (!body.content || body.content.trim() === '') {
        return sendJson(res, 400, { error: 'Post content cannot be empty' });
      }

      const authorId = body.authorId || 'usr_101';
      const author = members.find(m => m.id === authorId);

      const newPost = {
        id: `post_${Date.now()}`,
        authorId,
        content: body.content,
        imageUrl: body.imageUrl || null,
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        isCelebrity: author ? author.followersCount > 10000 : false
      };

      posts.unshift(newPost);

      return sendJson(res, 201, {
        message: 'Post published successfully',
        post: {
          ...newPost,
          author
        },
        kafkaEvent: {
          topic: 'post.created',
          partition: 3,
          offset: Math.floor(Math.random() * 100000)
        }
      });
    }

    // 5. GET /v1/members/:id (Slide 4)
    const memberMatch = pathname.match(/^\/v1\/members\/([a-zA-Z0-9_-]+)$/);
    if (memberMatch && method === 'GET') {
      const memberId = memberMatch[1];
      const member = members.find(m => m.id === memberId);
      if (!member) {
        return sendJson(res, 404, { error: `Member with id ${memberId} not found` });
      }
      return sendJson(res, 200, {
        member,
        shardInfo: {
          storageEngine: 'MySQL Cluster',
          shardKey: `hash(${memberId}) -> Shard #04`,
          consistency: 'Strong (Read-your-own-writes primary routing)'
        }
      });
    }

    // 6. GET /v1/members (List all members)
    if (pathname === '/v1/members' && method === 'GET') {
      return sendJson(res, 200, { data: members });
    }

    // 7. POST /v1/connections/requests (Slide 4)
    if (pathname === '/v1/connections/requests' && method === 'POST') {
      const body = await parseBody(req);
      if (!body.toId) {
        return sendJson(res, 400, { error: 'toId is required for connection request' });
      }

      const fromId = body.fromId || 'usr_101';
      const newRequest = {
        id: `req_${Date.now()}`,
        fromId,
        toId: body.toId,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      connectionRequests.push(newRequest);

      return sendJson(res, 201, {
        message: 'Connection request dispatched',
        request: newRequest,
        transaction: {
          type: '2-Phase Commit / Outbox Event',
          consistency: 'Strong (Slide 7 ACID guarantee)'
        }
      });
    }

    // 8. PUT /v1/connections/requests/:id (Slide 4)
    const reqMatch = pathname.match(/^\/v1\/connections\/requests\/([a-zA-Z0-9_-]+)$/);
    if (reqMatch && method === 'PUT') {
      const reqId = reqMatch[1];
      const body = await parseBody(req);
      const targetReq = connectionRequests.find(r => r.id === reqId);

      if (!targetReq) {
        return sendJson(res, 404, { error: `Connection request ${reqId} not found` });
      }

      const action = body.action || 'ACCEPTED'; // ACCEPTED or DECLINED
      targetReq.status = action;

      if (action === 'ACCEPTED') {
        const fromMember = members.find(m => m.id === targetReq.fromId);
        const toMember = members.find(m => m.id === targetReq.toId);
        if (fromMember) fromMember.connectionsCount += 1;
        if (toMember) toMember.connectionsCount += 1;
      }

      return sendJson(res, 200, {
        message: `Connection request ${action.toLowerCase()}`,
        request: targetReq
      });
    }

    // 9. GET /v1/search?q=&type= (Slide 4)
    if (pathname === '/v1/search' && method === 'GET') {
      const q = (query.q || '').toLowerCase();
      const type = (query.type || 'all').toLowerCase();

      let results = {
        members: [],
        posts: []
      };

      if (type === 'all' || type === 'people' || type === 'members') {
        results.members = members.filter(m =>
          m.name.toLowerCase().includes(q) ||
          m.headline.toLowerCase().includes(q) ||
          m.company.toLowerCase().includes(q) ||
          m.skills.some(s => s.toLowerCase().includes(q))
        );
      }

      if (type === 'all' || type === 'posts') {
        results.posts = posts.filter(p =>
          p.content.toLowerCase().includes(q)
        ).map(p => ({
          ...p,
          author: members.find(m => m.id === p.authorId)
        }));
      }

      return sendJson(res, 200, {
        query: q,
        type,
        total: results.members.length + results.posts.length,
        results,
        engine: 'Elasticsearch Inverted Index (Slide 6)'
      });
    }

    // 10. POST /v1/conversations/:id/messages (Slide 4)
    const convMatch = pathname.match(/^\/v1\/conversations\/([a-zA-Z0-9_-]+)\/messages$/);
    if (convMatch && method === 'POST') {
      const convId = convMatch[1];
      const body = await parseBody(req);

      if (!body.text || body.text.trim() === '') {
        return sendJson(res, 400, { error: 'Message text cannot be empty' });
      }

      let conv = conversations.find(c => c.id === convId);
      if (!conv) {
        conv = {
          id: convId,
          participants: [body.senderId || 'usr_101', 'usr_104'],
          messages: []
        };
        conversations.push(conv);
      }

      const newMsg = {
        id: `msg_${Date.now()}`,
        senderId: body.senderId || 'usr_101',
        text: body.text,
        createdAt: new Date().toISOString()
      };

      conv.messages.push(newMsg);

      return sendJson(res, 201, {
        message: 'Message delivered',
        data: newMsg,
        storage: 'Cassandra Quorum Write (Slide 6: read-in-order per chat)'
      });
    }

    // 11. Fallback for unhandled API endpoints
    return sendJson(res, 404, {
      error: 'Not Found',
      message: `Endpoint ${method} ${pathname} does not exist. Refer to /v1/health or /v1/system/architecture.`
    });

  } catch (error) {
    return sendJson(res, 500, {
      error: 'Internal Server Error',
      details: error.message
    });
  }
}

module.exports = {
  handleApiRequest
};
