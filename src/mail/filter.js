// updates is a writable store that is updated with the filtering updates
export async function filter_all({jmap, accountId, config}, updates, filter_cb) {
  const batch_size = 50
  updates.update($updates => ({
    ...$updates,
    state: 'Fetch first e-mails to filter...',
    progress_current: 0,
    progress_total: 0,
    done: false
  }))
  let query_position = {
    position: 0
  }
  await config[accountId].ready()
  let total_query = 0
  let total_actions = 0
  let total_estimated_actions = 0
  let position = 0
  const actions = []
  while(true) {
    const resp = await jmap.request([
      ['Email/query', {
        accountId,
        sort: [
          { property: 'receivedAt', isAscending: false }
        ],
        ...query_position,
        limit: batch_size,
        calculateTotal: true,
      }, '0'],
      ['Email/get', {
        accountId,
        properties: [
          'mailboxIds',
          ...[
            'from', 'to', 'cc', 'bcc', 'delivered-to'
          ].map(h => headers_translate[h])
        ],
        '#ids': { resultOf: '0', name: 'Email/query', path: '/ids' }
      }, '1']
    ])
    const resp_query = resp.get('Email/query')

    if (resp_query.ids.length == 0) break

    total_query = resp_query.total
    total_actions = actions.length
    total_estimated_actions = total_query - position
    updates.update($updates => ({
      ...$updates,
      state: `[1/2] Calculate filters email ${position} of ${total_query} (${total_actions} emails to filter)`,
      progress_current: position,
      progress_total: total_query + total_actions + total_estimated_actions
    }))
    position = resp_query.position || (position + resp_query.ids.length)
    query_position = {
      anchor: resp_query.ids[resp_query.ids.length - 1],
      anchorOffset: 1,
    }
    for(const email of resp.get('Email/get').list) {
      let act = null
      filter_email(email, config[accountId], ({mailboxId}) => {
        act ||= {}
        act[`mailboxIds/${mailboxId}`] = true
        if(filter_cb) filter_cb(act)
      })
      if (act) actions.push([email.id, act])
      updates.update($updates => ({
        ...$updates,
        progress_current: $updates.progress_current + 1,
        progress_total: $updates.progress_total - (act ? 0 : 1)
      }))
    }
    if (position + resp_query.limit >= total_query) {
      break
    }
  }

  total_actions = actions.length
  let processed = 0
  for (let batch = actions.splice(0, batch_size); batch.length; batch = actions.splice(0, batch_size)) {
    updates.update($updates => ({
      ...$updates,
      state: `[2/2] Move filtered e-mails ${processed} of ${total_actions}`,
      progress_current: total_query + processed,
      progress_total: total_query + total_actions
    }))
    const resp = await jmap.request([
      ['Email/set', {
        accountId,
        update: batch.map(([emailId, update]) => ({
          [emailId]: update
        })).reduce((a,b) => Object.assign(a,b), {})
      }, '0'],
    ])
    processed += batch.length
  }

  updates.update($updates => ({
    ...$updates,
    state: 'Done',
    done: true
  }))

  return processed
}

export const headers_translate = {
  from: 'from',
  to: 'to',
  cc: 'cc',
  bcc: 'bcc',
  'delivered-to': 'header:Delivered-To:asAddresses:all'
}

export function filter_email(email, config, action_cb) {
  for(const [header, filter_header] of Object.entries(config.config.filters)) {
    for(const [addr, filter_addr] of Object.entries(filter_header)) {
      for(const email_addr of email[headers_translate[header]]) {
        if (email_addr.email == addr) {
          action_cb(filter_addr)
        }
      }
    }
  }
}
