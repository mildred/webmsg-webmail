import getPkce from 'oauth-pkce';
import { get } from './stores.js'
import { EventSourcePolyfill as EventSource } from 'event-source-polyfill';

class OAuthClient {

  constructor(domain, store) {
    this.domain = domain
    this.store = store
    this.get_from_store()
  }

  get_from_store() {
    if (!this.store) return

    const unsubscribe = this.store.subscribe(data => {
      this.access_token = data.oauth_access_token
      this.token_type = data.oauth_token_type
      this.access_token_limit = new Date(data.oauth_access_token_limit)
      this.refresh_token = data.oauth_refresh_token
    })
    unsubscribe()
  }

  async handle_unauthorized(res) {
    return await this.login()
  }

  get oauth_redirect_url() { return `${location.origin}/app/oauth_response.html` }
  get oauth_client_id()    { return '0' }

  async get_pkce_async(size) {
    return new Promise((resolve, reject) => getPkce(size, (error, res) => {
      if (error) reject(error)
      else resolve(res)
    }))
  }

  async oauth_auth(auth_url, params) {
    const url = auth_url
      + `?client_id=${encodeURIComponent(params.client_id)}`
      + `&redirect_uri=${encodeURIComponent(params.redirect_uri)}`
      + '&response_type=code'
      + `&state=${encodeURIComponent(params.state)}`
      + `&scope=${encodeURIComponent((params.scopes || []).join(' '))}`
      + `&code_challenge=${encodeURIComponent(params.challenge)}`
      + `&code_challenge_method=${encodeURIComponent(params.code_challenge_method || 'S256')}`

    return await new Promise((accept) => {
      window.addEventListener('message', onMessage)

      window.open(url, '_blank')

      function onMessage(e){
        if (!typeof(e.data) == 'object') return;
        if (!e.data["oauth-response"]) return

        const res_params = Object.fromEntries(e.data["oauth-response"])
        if(res_params.state == params.state) {
          window.removeEventListener('message', onMessage)
          accept(res_params)
        } else {
          console.error("Received mismatching state from %o\nevent: %o", res_params, e)
        }
      }
    })
  }

  async request_oauth_metadata() {
    const res = await fetch(`${this.domain}/.well-known/oauth-authorization-server`)
    const body = await res.json()
    return body
  }

  async login() {
    this.oauth_metadata ||= await this.request_oauth_metadata()

    const state_size = 32
    const challenge_size = 48
    const state = Array.from(crypto.getRandomValues(new Uint8Array(state_size)), i => i.toString(16).padStart(2, "0")).join(""); 
    const { verifier, challenge } = await this.get_pkce_async(challenge_size)

    const params = await this.oauth_auth(this.oauth_metadata.authorization_endpoint, {
      client_id: this.oauth_client_id,
      redirect_uri: this.oauth_redirect_url,
      response_type: 'code',
      state: state,
      scope: [],
      code_challenge: challenge,
      code_challenge_method: 'S256',
    })

    await this.oauth_get_token({
      'grant_type':    'authorization_code',
      'code':          params.code,
      'code_verifier': verifier,
      'redirect_uri':  this.oauth_redirect_url
    })
  }

  async oauth_get_token(params) {
    this.oauth_metadata ||= await this.request_oauth_metadata()
    const now = new Date()

    const resp = await fetch(this.oauth_metadata.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        'client_id': this.oauth_client_id,
        ...params
      })
    })

    const tokens = await resp.json()
    const limit = now.getTime() + tokens.expires_in * 1000 - 60000
    this.access_token = tokens.access_token
    this.token_type = tokens.token_type
    this.access_token_limit = new Date(limit)
    this.refresh_token = tokens.refresh_token

    if (this.store) this.store.update(data => ({
      ...data,
      oauth_access_token: tokens.access_token,
      oauth_token_type: tokens.token_type,
      oauth_access_token_limit: limit,
      oauth_refresh_token: tokens.refresh_token
    }))
  }

  async get_authorization_header() {
    this.get_from_store()
    if (! this.access_token) {
      await this.login()
    }
    if (this.access_token_limit < new Date()) {
      await this.oauth_get_token({
        'grant_type':    'refresh_token',
        'refresh_token': this.refresh_token
      })
    }
    return `${this.token_type} ${this.access_token}`
  }

}

class JMAPResponse {
  constructor(resp) {
    Object.assign(this, resp)
  }

  // Get the response for a specific request using the request name
  // (Email/query) and the request id (3rd value of the request)
  //
  // Specify either the id, the name, or the name and id
  get(name, id) {
    for(let res of this.methodResponses) {
      if(id === undefined && res[2] === name) return res[1];
      if(id === undefined && res[0] === name) return res[1];
      if(res[0] === name && res[2] === id) return res[1];
    }
    console.warn('Cannot get(%o, %o) result %o', name, id, this)
    return null;
  }

}

class JMAPTransport {
  constructor(jmap) {
    this.auth = jmap.auth
    this.jmap = jmap
  }

  async init_websockets(session) {
    if (this.websockets_started) return
    this.websockets_started = true

    return // No way to set authorization header
    /*

    if (!session.capabilities["urn:ietf:params:jmap:websocket"]) return

    const { url, supportsPush } = session.capabilities["urn:ietf:params:jmap:websocket"]
    const authorization = await this.auth.get_authorization_header()
    this.websockets_supports_push = supportsPush
    this.websockets = new WebSocket(`${url}${url.includes('?') ? '&' : '?'}authorization=${encodeURIComponent(authorization)}`, ['jmap'])

    this.websockets.addEventListener('open', (e) => {
      this.websockets_opened = true
    })
    this.websockets.addEventListener('message', (e) => {
      const { data } = e
    })
    */
  }

  async init_eventsource(session, types, single_event, ping) {
    if (this.eventsource_started) return
    this.eventsource_started = true

    const { eventSourceUrl } = session
    const authorization = await this.auth.get_authorization_header()

    const url = eventSourceUrl
      .replaceAll('{types}', (types || ['*']).join(','))
      .replaceAll('{closeafter}', single_event ? 'state' : 'no')
      .replaceAll('{ping}', ping || '300')

    this.eventsource = new EventSource(url, {
      headers: {
        Authorization: authorization
      }
    })

    this.eventsource.addEventListener('state', (e) => {
      const data = JSON.parse(e.data)
      console.log('[jmap] eventsource: %o', data)
      this.jmap.dispatch_state_changes(data)
    })
  }

  async request(req, opts) {
    const session = await this.jmap.request_session()
    this.init_websockets(session)
    while(true) {
      const res = await fetch(session.apiUrl, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          'Authorization': await this.auth.get_authorization_header()
        },
        body: JSON.stringify({
          ...opts,
          using: Object.keys(session.capabilities),
          methodCalls: req,
        }),
      })
      if (res.status == 401) {
        await this.auth.handle_unauthorized(res)
        continue
      }
      const body = await res.json()
      return new JMAPResponse(body)
    }
  }

  async blob_data(accountId, blobId, name, type, filter) {
    const charset = type.match(/charset=(\S*)/)[1]

    const url = await this.jmap.blob_url({accountId, blobId, name, type})

    const resp = await fetch(url, {
      'headers': {
        Authorization: await this.auth.get_authorization_header()
      }
    })
    const blob = await resp.blob()

    const text = await new Promise((accept, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        accept(reader.result)
      }
      reader.readAsText(blob, charset)
    })

    return filter ? filter(text, type) : text
  }

  async blob(accountId, blobId, name, type, filter) {
    const text = await this.blob_data(accountId, blobId, name, type, filter)
    return new Blob([text], {type: type})
  }
}

export class JMAP {
  constructor(domain, store) {
    this.domain = domain
    this.auth = new OAuthClient(domain, store)
    this.transport = new JMAPTransport(this)
    this.state_change_callbacks = []
  }

  get session_url() {
    return `${this.domain}/.well-known/jmap/`
  }

  async request_session() {
    if (this.session) return this.session

    while(true) {
      const res = await fetch(this.session_url, {
        headers: { 'Authorization': await this.auth.get_authorization_header() }
      })
      if (res.status == 401) {
        await this.auth.handle_unauthorized(res)
        continue
      }
      const body = await res.json()
      this.session = body
      console.log("[jmap] session = %o", body)
      return body
    }
  }

  async blob_url({accountId, blobId, name, type}) {
    const session = await this.request_session()
    return new URL(session.downloadUrl
      .replace('{accountId}', encodeURIComponent(accountId))
      .replace('{blobId}', encodeURIComponent(blobId))
      .replace('{name}', encodeURIComponent(name || 'file.dat'))
      .replace('{type}', encodeURIComponent(type || 'application/octet-stream')),
      this.session_url)
  }

  async blob_data(accountId, blobId, name, type, filter) {
    return await this.transport.blob_data(accountId, blobId, name, type, filter)
  }

  async blob(accountId, blobId, name, type, filter) {
    return await this.transport.blob(accountId, blobId, name, type, filter)
  }

  async request(...args) {
    return await this.transport.request(...args)
  }

  async get_first_account_id() {
    const session = await this.request_session()
    const ids = Object.keys(session.accounts)
    return ids[0]
  }

  async get_state_changes(callback) {
    const session = await this.request_session()
    const index = this.state_change_callbacks.length
    this.state_change_callbacks.push(callback)
    await this.transport.init_eventsource(session)
    return index
  }

  clear_get_state_changes(index_or_callback) {
    const index = typeof(index_or_callback) == 'number' ?
      index_or_callback :
      this.state_change_callbacks.indexOf(index_or_callback)
    delete this.state_change_callbacks[index]
  }

  dispatch_state_changes(data){
    for(const i in this.state_change_callbacks) {
      const cb = this.state_change_callbacks[i]
      cb(data)
    }
  }
}
