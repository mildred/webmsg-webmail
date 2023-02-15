import { saved_sources, get } from './stores.js';
import { hashAlgorithm } from './sources.js';
import getPkce from 'oauth-pkce';

const default_gitlab_config = {
  authorizationUrl: 'https://gitlab.com/oauth/authorize',
  tokenUrl: 'https://gitlab.com/oauth/token',
  revokeUrl: 'https://gitlab.example.com/oauth/revoke',
  redirectUrl: `${location.origin}/hcms/popup.html`,
  apiUrl: 'https://gitlab.com/api/v4',
  branch: 'master',
}

async function getPkceAsync(size) {
  return new Promise((resolve, reject) => getPkce(size, (error, res) => {
    if (error) reject(error)
    else resolve(res)
  }))
}

//
// Parse link header
// credits: <https://coderwall.com/p/zrlulq/parsing-a-link-header-in-javascript>
//

// Unquote string (utility)
function unquote(value) {
    if (value.charAt(0) == '"' && value.charAt(value.length - 1) == '"') return value.substring(1, value.length - 1);
    return value;
}

// Parse a Link header
function parseLinkHeader(header) {
    var linkexp = /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g;
    var paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g;

    var matches = header.match(linkexp);
    var rels = new Object();
    for (let i = 0; i < matches.length; i++) {
        var split = matches[i].split('>');
        var href = split[0].substring(1);
        var ps = split[1];
        var link = new Object();
        link.href = href;
        var s = ps.match(paramexp);
        for (let j = 0; j < s.length; j++) {
            var p = s[j];
            var paramsplit = p.split('=');
            var name = paramsplit[0];
            link[name] = unquote(paramsplit[1]);
        }

        if (link.rel != undefined) {
            rels[link.rel] = link;
        }
    }

    return rels;
}

//
// Fetch all pages in Gitlab API
//

async function fetchPages(url, opts) {
  const res = []
  let next_url = `${url}&pagination=keyset`
  while(next_url) {
    const resp = await fetch(next_url, opts)
    const link = parseLinkHeader(resp.headers.get('link'))
    next_url = link.next && link.next.href
    const json = await resp.json()
    res.push(json)
  }
  return res
}

export async function gitlabCreateMergeRequests(gitlab_config){
  let merge_request_links = null
  const {
    authorizationUrl,
    tokenUrl,
    revokeUrl,
    clientId,
    redirectUrl,
    apiUrl,
    repository,
    branch,
  } = {...default_gitlab_config, ...gitlab_config}

  const state_size = 32
  const challenge_size = 48
  const scopes = ['api', 'write_repository']
  const state = Array.from(crypto.getRandomValues(new Uint8Array(state_size)), i => i.toString(16).padStart(2, "0")).join(""); 

  const { verifier, challenge } = await getPkceAsync(challenge_size)

  const url = authorizationUrl
    + `?client_id=${encodeURIComponent(clientId)}`
    + `&redirect_uri=${encodeURIComponent(redirectUrl)}`
    + '&response_type=code'
    + `&state=${encodeURIComponent(state)}`
    + `&scope=${encodeURIComponent(scopes.join(' '))}`
    + `&code_challenge=${encodeURIComponent(challenge)}`
    + '&code_challenge_method=S256'

  const params = await new Promise((accept) => {
    window.addEventListener('message', onMessage)

    window.open(url, '_blank')

    function onMessage(e){
      if (!typeof(e.data) == 'object') return;
      if (!e.data["hcms-oauth-popup"]) return

      const params = Object.fromEntries(e.data["hcms-oauth-popup"])
      if(params.state == state) {
        window.removeEventListener('message', onMessage)
        accept(params)
      } else {
        console.error("Received mismatching state from %o\nevent: %o", params, e)
      }
    }
  })

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      'client_id':     clientId,
      'code':          params.code,
      'grant_type':    'authorization_code',
      'redirect_uri':  redirectUrl,
      'code_verifier': verifier,
    })
  })

  const tokens = await resp.json()

  let res = await fetch(`${apiUrl}/projects/${encodeURIComponent(repository)}/repository/commits/${encodeURIComponent(branch)}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokens.access_token}`, }
  })
  const commit = await res.json()

  const tree = (await fetchPages(`${apiUrl}/projects/${encodeURIComponent(repository)}/repository/tree` +
    `?recursive=true&per_page=100&order_by=path&sort=asc&ref=${encodeURIComponent(commit.id)}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokens.access_token}`, }
  })).flat()

  const sources = get(saved_sources)
  const actions = {}
  const manifest = {}
  for(const path of Object.keys(sources)){
    const { upstream, data } = sources[path]
    const { git_commit, git_hash, hash } = upstream

    let start_sha = git_commit || commit.id
    const upstream_git_file = tree.find(f => f.path == path)
    if (upstream_git_file && upstream_git_file.id == git_hash) {
      start_sha = commit.id
    }

    manifest[start_sha] ||= []
    actions[start_sha] ||= []

    manifest[start_sha].push(`${hashAlgorithm}:${hash}\tgit:${git_hash}\t${path}`)
    actions[start_sha].push({
      action: 'update',
      file_path: path,
      content: data
    })
  }

  const merge_request_urls = []

  for(const git_commit of Object.keys(actions)) {
    const new_branch = `hcms/${new Date().toISOString().slice(0, 19).replaceAll('T', '-').replaceAll(':', '')}=${git_commit.slice(0, 8)}`

    res = await fetch(`${apiUrl}/projects/${encodeURIComponent(repository)}/repository/commits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({
        branch: new_branch,
        start_sha: git_commit,
        commit_message: "[HCMS] Changes via the HCMS interface\n\n" +
          `From commit: ${git_commit}\n` +
          "State of files before:\n\n" +
          manifest[git_commit].join("\n"),
        actions: actions[git_commit],
      })
    })
    await res.json()

    if (!res.ok) {
      // TODO: report error
      console.error("Failed to create commit: %o", res)
      continue
    }

    res = await
      fetch(`${apiUrl}/projects/${encodeURIComponent(repository)}/merge_requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({
        source_branch: new_branch,
        target_branch: branch,
        title: "[HCMS] Changes via the HCMS interface",
        description: `From commit: ${git_commit}\n\n` +
          "State of files before:\n\n" +
          (merge_request_urls.length == 0 ? '' : "Follows:\n\n- " + merge_request_urls.join("\n- ")),
      })
    })
    const res_merge_request = await res.json()

    merge_request_urls.push(res_merge_request.web_url)
    merge_request_links ||= []
    merge_request_links.push({
      url: res_merge_request.web_url,
      ref: res_merge_request.references?.short,
      title: res_merge_request.title,
    })
    console.log("Merge request created: %s", res_merge_request.web_url)
  }

  fetch(revokeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      'client_id':       clientId,
      'token_type_hint': 'access_token',
      'token':           tokens.access_token,
    })
  })
  fetch(revokeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      'client_id':       clientId,
      'token_type_hint': 'refresh_token',
      'token':           tokens.refresh_token,
    })
  })
  return merge_request_links;
}

