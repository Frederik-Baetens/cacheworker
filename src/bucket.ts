/* eslint-env worker */

const MAX_AGE = 86400 // 1 day

/**
 * @typedef {import('../bindings').SimpleBucket} SimpleBucket
 * @implements {SimpleBucket}
 */
export class CachingBucket {
  #source
  #cache
  #ctx

  /**
   * @param {SimpleBucket} source
   * @param {Cache} cache
   * @param {Pick<import('@cloudflare/workers-types').ExecutionContext, 'waitUntil'>} ctx
   */
  constructor (source, cache, ctx) {
    this.#source = source
    this.#cache = cache
    this.#ctx = ctx
  }

  /** @type {import('../bindings').SimpleBucket['get']} */
  async get (key) {
    const cacheKey = new URL('http://example')
    const res = await this.#cache.match(cacheKey)
    if (res && res.body) {
      console.log("CACHE HIT")
      return "CACHE HIT"
      //return { key, body: res.body }
    }
    const obj = await this.#source.get(key)
    if (!obj) {
      console.log("obj not found")
      //return null
      return "OBJECT NOT FOUND IN R2"
    }
    //const [body0, body1] = obj.body.tee()
    this.#ctx.waitUntil(this.#cache.put(cacheKey, new Response(obj.body.clone, {
      headers: { 'Cache-Control': `max-age=${MAX_AGE}` }
    })))
    console.log("CACHE MISS")
    //return { key, body: obj.body }
    return "CACHE MISS"
  }
}

/**
 * Cast an R2 bucket as a simple bucket.
 *
 * @param {import('@cloudflare/workers-types').R2Bucket} r2
 * @returns {SimpleBucket}
 */
// @ts-expect-error R2Bucket.get is overloaded with a non-optional options which
// means it does not overlap with our SimpleBucket interface :(
export const asSimpleBucket = r2 => r2
