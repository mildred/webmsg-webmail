import { readable, writable, ready, get, async_derived, fancy } from '../stores.js';
import { jmap } from '../stores.js'

export function threads_store({ accountId, mailboxId, request_position }){
  if (!request_position) {
    request_position = {
      position: 0, limit: 100
    }
  }

  let store_value = {
    total: null,
    emails: [],
    next: null,
    next_loading: false,
  }

  const jmap$ = jmap
  const accountId$ = accountId

  return fancy(store_value).init(async (_, set) => {
    const jmap = await ready(jmap$)
    const accountId = await ready(accountId$)

    async function get_threads(request_position){
      const resp = await jmap.request([
        ['Email/query', {
          accountId,
          collapseThreads: true,
          sort: [
            { property: 'receivedAt', isAscending: false }
          ],
          filter: {
            inMailbox: await mailboxId,
          },
          ...request_position,
          calculateTotal: true,
        }, '0'],
        ['Email/get', {
          accountId,
          '#ids': { resultOf: '0', name: 'Email/query', path: '/ids' }
        }, '1'],
        ['Thread/get', {
          accountId,
          '#ids': { resultOf: '1', name: 'Email/get', path: '/list/*/threadId' }
        }, '2']
      ])

      const threads = resp.get('Thread/get').list.reduce((h,v) => ({...h, [v.id]: v}), {})
      const emails = resp.get('Email/get').list.map(v => ({...v, thread: threads[v.threadId]}))
      const { total, position, limit } = resp.get('Email/query')

      console.log("%d emails already loaded, %d emails (limit %d) just loaded at position %d for a total of %d",
        store_value.emails.length, emails.length, limit, position, total)

      store_value = {
        total,
        emails: [
          ...store_value.emails,
          ...emails
        ],
        next_loading: false,
        more: total - (position || store_value.emails.length) - emails.length,
        next: (emails.length == 0 || emails.length < limit) ? null : () => {
          store_value.next = null
          store_value.next_loading = true
          set(store_value)
          state = get_threads({
            anchor: emails[emails.length - 1].id,
            anchorOffset: 1,
          })
        },
      }
      set(store_value)

      return resp.get('Email/get').state
    }

    let state = await get_threads(request_position)

    const unsubscribe_state_change = await jmap.get_state_changes(async ({changed}) => {
      const newState = changed[accountId].Email
      if (state != newState) {
        state = await get_threads(request_position)
      }
    })

    return stop
    function stop() {
      unsubscribe_state_change()
    }
  })
}

export function thread_emails_store({ accountId, threadId }){
  let store_value = {
    ready: false,
    loading: true,
    emails: [],
  }

  const jmap$ = jmap
  const accountId$ = accountId

  return fancy(store_value).init(async (_, { set, update, add_finalizer }) => {
    const jmap = await ready(jmap$)
    const accountId = await ready(accountId$)

    let state = await get_emails()

    add_finalizer(await jmap.get_state_changes(async ({changed}) => {
      const newState = changed[accountId].Thread
      if (state != newState) {
        update(store => ({...store, loading: true}))
        state = await get_emails()
      }
    }))

    async function get_emails(){
      const resp = await jmap.request([
        ['Thread/get', {
          accountId,
          ids: [await threadId]
        }, '0'],
        ['Email/get', {
          accountId,
          '#ids': { resultOf: '0', name: 'Thread/get', path: '/list/*/emailIds' }
        }, '1'],
      ])

      const emails = resp.get('Email/get').list

      console.log("[thread %s] Loaded %d emails", await threadId, emails.length)

      set({
        ready: true,
        loading: false,
        emails
      })

      return resp.get('Thread/get').state
    }
  })
}

