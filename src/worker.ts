import { CachingBucket, asSimpleBucket } from "./bucket";

interface Env {
  MY_BUCKET: R2Bucket
}

export default {
  async fetch(request, env, context) {
    try {
      const url = new URL(request.url);
      const objectKey = url.pathname.slice(1);

      const cache = await caches.open('index-source')
      const bucket = new CachingBucket(asSimpleBucket(env.MY_BUCKET), cache, context)

      return new Response((await bucket.get(objectKey)))

      // Construct the cache key from the cache URL
      const cacheKey = new Request(url.toString(), request);

      // Check whether the value is already available in the cache
      // if not, you will need to fetch it from R2, and store it in the cache
      // for future access
      //let response = await cache.match(cacheKey);
      let response = false;

      if (response) {
        const headers = new Headers(response.headers);
        headers.set("worker-cache", "HIT")
        return new Response(response.body, {headers});
      }

      console.log(
        `Response for request url: ${request.url} not present in cache. Fetching and caching request.`
      );

      // If not in cache, get it from R2
      const object = await env.MY_BUCKET.get(objectKey);
      if (object === null) {
        return new Response('Object Not Found', { status: 404 });
      }

      // Set the appropriate object headers
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);

      // Cache API respects Cache-Control headers. Setting s-max-age to 10
      // will limit the response to be in cache for 10 seconds max
      // Any changes made to the response here will be reflected in the cached value
      headers.append('Cache-Control', 's-maxage=10000');

      response = new Response(object.body, {
        headers,
      });

      // Store the fetched response as cacheKey
      // Use waitUntil so you can return the response without blocking on
      // writing to cache
      context.waitUntil(cache.put(cacheKey, response.clone()));

      response.headers.set("worker-cache", "MISS")
      return response;
    } catch (e) {
      return new Response('Error thrown ' + e.message);
    }
  },
};
