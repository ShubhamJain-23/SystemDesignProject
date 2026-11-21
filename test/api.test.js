const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('events');
const { handleApiRequest } = require('../src/app');

// Mock Request & Response helper to test without network sockets (works in any sandbox/CI)
function simulateRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = path;
    req.headers = headers;

    let resData = '';
    let resStatusCode = 200;
    let resHeaders = {};

    const res = {
      writeHead(code, h) {
        resStatusCode = code;
        resHeaders = h || {};
      },
      setHeader(k, v) {
        resHeaders[k] = v;
      },
      end(chunk) {
        if (chunk) resData += chunk;
        let parsed = resData;
        try {
          parsed = JSON.parse(resData);
        } catch {}
        resolve({
          statusCode: resStatusCode,
          headers: resHeaders,
          body: parsed,
          raw: resData
        });
      }
    };

    handleApiRequest(req, res);

    if (body) {
      const dataStr = typeof body === 'string' ? body : JSON.stringify(body);
      req.emit('data', Buffer.from(dataStr));
    }
    req.emit('end');
  });
}

test('LinkedIn System Design & DevOps API Test Suite', async (t) => {
  await t.test('1. Health Check (GET /v1/health)', async () => {
    const res = await simulateRequest('GET', '/v1/health');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'UP');
    assert.ok(res.body.service.includes('LinkedIn System Design'));
  });

  await t.test('2. System Architecture Metadata (GET /v1/system/architecture)', async () => {
    const res = await simulateRequest('GET', '/v1/system/architecture');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.dailyActiveUsers.includes('100M'));
    assert.ok(res.body.peakThroughput.includes('100K Read RPS'));
    assert.ok(res.body.cachingStrategy.includes('Redis'));
  });

  await t.test('3. Home Feed with Cursor Pagination (GET /v1/feed)', async () => {
    const res = await simulateRequest('GET', '/v1/feed?limit=2');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.strictEqual(res.body.data.length, 2);
    assert.ok(res.body.pagination.hasMore);
    assert.ok(res.body.pagination.nextCursor);
    assert.ok(res.body.data[0].author.name);
  });

  await t.test('4. Create Post (POST /v1/posts)', async () => {
    const res = await simulateRequest('POST', '/v1/posts', {
      authorId: 'usr_101',
      content: 'Automated CI/CD Verification Post'
    });
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.message, 'Post published successfully');
    assert.strictEqual(res.body.post.content, 'Automated CI/CD Verification Post');
    assert.strictEqual(res.body.kafkaEvent.topic, 'post.created');
  });

  await t.test('5. Reject Empty Post (POST /v1/posts with empty content)', async () => {
    const res = await simulateRequest('POST', '/v1/posts', {
      content: ''
    });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error, 'Post content cannot be empty');
  });

  await t.test('6. Member Profile Lookup (GET /v1/members/:id)', async () => {
    const res = await simulateRequest('GET', '/v1/members/usr_101');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.member.name, 'Shubham Jain');
    assert.ok(res.body.shardInfo.shardKey.includes('hash(usr_101)'));
  });

  await t.test('7. Member Profile 404 on Invalid ID', async () => {
    const res = await simulateRequest('GET', '/v1/members/usr_invalid_999');
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.body.error.includes('not found'));
  });

  await t.test('8. Full-Text Search (GET /v1/search?q=DevOps)', async () => {
    const res = await simulateRequest('GET', '/v1/search?q=DevOps&type=all');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.total >= 1);
    assert.strictEqual(res.body.engine, 'Elasticsearch Inverted Index (Slide 6)');
  });

  await t.test('9. Connection Request Flow (POST & PUT /v1/connections/requests)', async () => {
    // Send request
    const postRes = await simulateRequest('POST', '/v1/connections/requests', {
      fromId: 'usr_101',
      toId: 'usr_104'
    });
    assert.strictEqual(postRes.statusCode, 201);
    const reqId = postRes.body.request.id;

    // Accept request
    const putRes = await simulateRequest('PUT', `/v1/connections/requests/${reqId}`, {
      action: 'ACCEPTED'
    });
    assert.strictEqual(putRes.statusCode, 200);
    assert.strictEqual(putRes.body.request.status, 'ACCEPTED');
  });

  await t.test('10. 1:1 Conversation Messaging (POST /v1/conversations/:id/messages)', async () => {
    const res = await simulateRequest('POST', '/v1/conversations/conv_301/messages', {
      senderId: 'usr_101',
      text: 'CI/CD pipeline test message'
    });
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.message, 'Message delivered');
    assert.ok(res.body.storage.includes('Cassandra Quorum Write'));
  });
});
