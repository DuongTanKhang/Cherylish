const urls = ["http://127.0.0.1:3001/login", "http://127.0.0.1:4000/api/v1/health/ready"];
try { const responses = await Promise.all(urls.map((url) => fetch(url, { signal: AbortSignal.timeout(3000) }))); if (responses.some((response) => response.status >= 500)) process.exit(1); } catch { process.exit(1); }
